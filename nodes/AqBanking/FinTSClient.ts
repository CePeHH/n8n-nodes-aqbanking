// Import fints with proper typing - it may not have FinTS export directly
let FinTS: any;
try {
	FinTS = require('fints');
} catch (error) {
	// Gracefully handle missing fints dependency
	FinTS = null;
}

import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';

export class NativeFinTSClient {
	private client: any;
	private credentials: any;

	constructor(credentials: any) {
		this.credentials = credentials;
	}

	private async initializeClient(): Promise<void> {
		if (this.client) {
			return;
		}

		if (!FinTS) {
			throw new Error('FinTS library not available. Please install the fints package: npm install fints');
		}

		try {
			// Initialize FinTS client - check different possible export patterns
			const FinTSClient = FinTS.default || FinTS.FinTSClient || FinTS;
			
			this.client = new FinTSClient(
				this.credentials.bankCode,
				this.credentials.userId,
				this.credentials.pin,
				this.credentials.serverUrl,
			);

			// Set product ID for identification
			if (this.client.productId !== undefined) {
				this.client.productId = 'n8n-aqbanking-node';
			}

			if (this.credentials.enableDebugLogging) {
				// Enable debug logging if requested
				if (this.client.debug !== undefined) {
					this.client.debug = true;
				}
			}

		} catch (error) {
			throw new Error(`Failed to initialize FinTS client: ${(error as Error).message}`);
		}
	}

	async getBalance(accountNumber: string): Promise<any> {
		await this.initializeClient();

		try {
			// Get accounts first
			const accounts = await this.client.accounts();
			
			// Find the requested account
			const account = accounts.find((acc: any) => 
				acc.accountNumber === accountNumber || 
				acc.iban === accountNumber ||
				acc.iban?.replace(/\s/g, '') === accountNumber.replace(/\s/g, '')
			);

			if (!account) {
				throw new Error(`Account ${accountNumber} not found. Available accounts: ${accounts.map((a: any) => a.iban || a.accountNumber).join(', ')}`);
			}

			// Get balance for the account
			const balance = await this.client.balance(account);

			return {
				balance: parseFloat(balance.amount?.toString() || '0'),
				currency: balance.currency || 'EUR',
				accountNumber: account.accountNumber,
				iban: account.iban,
				bankCode: account.bankCode,
				accountName: account.name,
				timestamp: new Date().toISOString(),
				date: balance.date?.toISOString() || new Date().toISOString(),
			};

		} catch (error) {
			throw new Error(`Failed to get balance: ${(error as Error).message}`);
		}
	}

	async getTransactions(accountNumber: string, startDate?: Date, endDate?: Date): Promise<any> {
		await this.initializeClient();

		try {
			// Get accounts first
			const accounts = await this.client.accounts();
			
			// Find the requested account
			const account = accounts.find((acc: any) => 
				acc.accountNumber === accountNumber || 
				acc.iban === accountNumber ||
				acc.iban?.replace(/\s/g, '') === accountNumber.replace(/\s/g, '')
			);

			if (!account) {
				throw new Error(`Account ${accountNumber} not found`);
			}

			// Get transactions for the account
			const transactions = await this.client.transactions(account, startDate, endDate);

			// Transform transactions to standardized format
			const transformedTransactions = transactions.map((transaction: any) => ({
				amount: parseFloat(transaction.amount?.toString() || '0'),
				currency: transaction.currency || 'EUR', 
				date: transaction.date?.toISOString() || '',
				valutaDate: transaction.valutaDate?.toISOString() || '',
				remoteName: transaction.remoteName || '',
				purpose: transaction.purpose || transaction.text || '',
				remoteIBAN: transaction.remoteIban || '',
				remoteBIC: transaction.remoteBic || '',
				transactionCode: transaction.transactionCode || '',
				reference: transaction.reference || '',
				bookingText: transaction.bookingText || '',
				primaNotaNumber: transaction.primaNotaNumber || '',
			}));

			return {
				transactions: transformedTransactions,
				count: transformedTransactions.length,
				accountNumber: account.accountNumber,
				iban: account.iban,
				bankCode: account.bankCode,
				timestamp: new Date().toISOString(),
			};

		} catch (error) {
			throw new Error(`Failed to get transactions: ${(error as Error).message}`);
		}
	}

	async getAccounts(): Promise<any[]> {
		await this.initializeClient();

		try {
			const accounts = await this.client.accounts();
			
			return accounts.map((account: any) => ({
				accountNumber: account.accountNumber,
				iban: account.iban,
				bic: account.bic,
				bankCode: account.bankCode,
				accountName: account.name || account.accountName,
				bankName: account.bankName,
				accountType: account.type,
			}));

		} catch (error) {
			throw new Error(`Failed to get accounts: ${(error as Error).message}`);
		}
	}

	async close(): Promise<void> {
		if (this.client) {
			try {
				await this.client.close();
			} catch (error) {
				// Ignore close errors
			}
			this.client = null;
		}
	}
}

// Python FinTS implementation
export async function executePythonFinTS(executeFunctions: IExecuteFunctions, operation: string, params: any): Promise<any> {
	const { spawn } = require('child_process');
	const credentials = params.credentials;
	
	return new Promise((resolve, reject) => {
		const pythonScript = generatePythonScript(operation, params);
		const pythonPath = credentials.pythonPath || 'python';
		
		const pythonProcess = spawn(pythonPath, ['-c', pythonScript], {
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';

		pythonProcess.stdout.on('data', (data: Buffer) => {
			stdout += data.toString();
		});

		pythonProcess.stderr.on('data', (data: Buffer) => {
			stderr += data.toString();
		});

		pythonProcess.on('close', (code: number) => {
			if (code !== 0) {
				reject(new NodeOperationError(executeFunctions.getNode(), 
					`Python FinTS process failed with code ${code}. Error: ${stderr}`
				));
				return;
			}

			try {
				const result = JSON.parse(stdout);
				resolve(result);
			} catch (error) {
				reject(new NodeOperationError(executeFunctions.getNode(), 
					`Failed to parse Python FinTS response: ${(error as Error).message}`
				));
			}
		});

		pythonProcess.on('error', (error: Error) => {
			reject(new NodeOperationError(executeFunctions.getNode(), 
				`Failed to execute Python FinTS: ${error.message}. Make sure Python and python-fints are installed.`
			));
		});
	});
}

function generatePythonScript(operation: string, params: any): string {
	const credentials = params.credentials;
	
	const baseScript = `
import sys
import json
from datetime import datetime, date
try:
    from fints import FinTS3PinTanClient
except ImportError:
    print(json.dumps({"error": "python-fints package not installed. Run: pip install python-fints"}))
    sys.exit(1)

def json_serial(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

try:
    client = FinTS3PinTanClient(
        "${credentials.bankCode}",
        "${credentials.userId}",
        "${credentials.pin}",
        "${credentials.serverUrl}"
    )
`;

	switch (operation) {
		case 'getBalance':
			return baseScript + `
    accounts = client.get_sepa_accounts()
    account = None
    for acc in accounts:
        if acc.iban == "${params.accountNumber}" or acc.accountnumber == "${params.accountNumber}":
            account = acc
            break
    
    if not account:
        result = {"error": f"Account ${params.accountNumber} not found"}
    else:
        balance = client.get_balance(account)
        result = {
            "balance": float(balance.amount.amount),
            "currency": balance.amount.currency,
            "accountNumber": account.accountnumber,
            "iban": account.iban,
            "timestamp": datetime.now().isoformat()
        }
    
    print(json.dumps(result, default=json_serial))
    
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

		case 'getTransactions':
			return baseScript + `
    accounts = client.get_sepa_accounts()
    account = None
    for acc in accounts:
        if acc.iban == "${params.accountNumber}" or acc.accountnumber == "${params.accountNumber}":
            account = acc
            break
    
    if not account:
        result = {"error": f"Account ${params.accountNumber} not found"}
    else:
        start_date = ${params.startDate ? `datetime.fromisoformat("${params.startDate}")` : 'None'}
        end_date = ${params.endDate ? `datetime.fromisoformat("${params.endDate}")` : 'None'}
        
        transactions = client.get_transactions(account, start_date, end_date)
        
        trans_list = []
        for trans in transactions:
            trans_list.append({
                "amount": float(trans.data["amount"].amount),
                "currency": trans.data["amount"].currency,
                "date": trans.data["booking_date"].isoformat() if trans.data.get("booking_date") else "",
                "remoteName": trans.data.get("applicant_name", ""),
                "purpose": trans.data.get("purpose", ""),
                "reference": trans.data.get("end_to_end_reference", "")
            })
        
        result = {
            "transactions": trans_list,
            "count": len(trans_list),
            "accountNumber": account.accountnumber,
            "iban": account.iban,
            "timestamp": datetime.now().isoformat()
        }
    
    print(json.dumps(result, default=json_serial))
    
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

		default:
			return baseScript + `
    print(json.dumps({"error": f"Unknown operation: ${operation}"}))
`;
	}
}

// Docker FinTS implementation
export async function executeDockerFinTS(executeFunctions: IExecuteFunctions, operation: string, params: any): Promise<any> {
	const { spawn } = require('child_process');
	const credentials = params.credentials;
	const os = require('os');
	
	return new Promise((resolve, reject) => {
		const dockerImage = credentials.dockerImage || 'ghcr.io/larsux/aqbanking-docker';
		const configVolume = `${os.homedir()}/.aqbanking:/root/.aqbanking`;
		
		const dockerArgs = [
			'run', '--rm',
			'-v', configVolume,
			dockerImage,
			'aqbanking-cli', '--noninteractive',
			...buildDockerOperationArgs(operation, params)
		];

		const dockerProcess = spawn('docker', dockerArgs, {
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';

		dockerProcess.stdout.on('data', (data: Buffer) => {
			stdout += data.toString();
		});

		dockerProcess.stderr.on('data', (data: Buffer) => {
			stderr += data.toString();
		});

		dockerProcess.on('close', (code: number) => {
			if (code !== 0) {
				reject(new NodeOperationError(executeFunctions.getNode(), 
					`Docker FinTS process failed with code ${code}. Error: ${stderr}`
				));
				return;
			}

			try {
				// Parse the AqBanking CLI output
				const result = parseAqBankingOutput(operation, stdout);
				resolve(result);
			} catch (error) {
				reject(new NodeOperationError(executeFunctions.getNode(), 
					`Failed to parse Docker FinTS response: ${(error as Error).message}`
				));
			}
		});

		dockerProcess.on('error', (error: Error) => {
			reject(new NodeOperationError(executeFunctions.getNode(), 
				`Failed to execute Docker FinTS: ${error.message}. Make sure Docker is installed and running.`
			));
		});
	});
}

function buildDockerOperationArgs(operation: string, params: any): string[] {
	const args: string[] = [];
	
	// Add common arguments first
	if (params.credentials.nonInteractive) {
		args.push('--noninteractive');
	}
	
	// Add server URL if provided
	if (params.credentials.serverUrl) {
		args.push('--url', params.credentials.serverUrl);
	}
	
	switch (operation) {
		case 'getBalance':
			args.push('request', '--balance');
			if (params.bankCode) {
				args.push('-b', params.bankCode);
			}
			args.push('-a', params.accountNumber);
			break;
			
		case 'getTransactions':
			args.push('request', '--transactions');
			if (params.bankCode) {
				args.push('-b', params.bankCode);
			}
			args.push('-a', params.accountNumber);
			if (params.startDate) {
				args.push('--fromdate', params.startDate);
			}
			if (params.endDate) {
				args.push('--todate', params.endDate);
			}
			break;
	}
	
	return args;
}

function parseAqBankingOutput(operation: string, output: string): any {
	// Reuse existing parsing functions from the main node
	switch (operation) {
		case 'getBalance':
			return parseBalanceOutputForDocker(output);
		case 'getTransactions':
			return parseTransactionOutputForDocker(output);
		default:
			return { rawOutput: output };
	}
}

function parseBalanceOutputForDocker(output: string): { balance: number; currency: string } {
	const patterns = [
		/(?:Wert|Value|Balance)\s*:\s*([\d,.-]+)\s*([A-Z]{3})/i,
		/Saldo\s*:\s*([\d,.-]+)\s*([A-Z]{3})/i,
		/([\d,.-]+)\s*([A-Z]{3})\s*(?:Saldo|Balance)/i,
	];

	for (const pattern of patterns) {
		const match = output.match(pattern);
		if (match) {
			const balanceString = match[1].replace(/\./g, '').replace(',', '.');
			const balance = parseFloat(balanceString);
			if (!isNaN(balance)) {
				return { balance, currency: match[2] };
			}
		}
	}

	throw new Error(`Could not parse balance from Docker output: ${output}`);
}

function parseTransactionOutputForDocker(output: string): any[] {
	const transactions: any[] = [];
	const lines = output.split('\n');
	let currentTransaction: any = {};

	for (const line of lines) {
		const trimmedLine = line.trim();
		
		if (trimmedLine.startsWith('transaction ') || trimmedLine.startsWith('Transaction ')) {
			if (Object.keys(currentTransaction).length > 0) {
				transactions.push(currentTransaction);
			}
			currentTransaction = {};
			continue;
		}

		const colonIndex = trimmedLine.indexOf(':');
		if (colonIndex === -1) continue;

		const key = trimmedLine.substring(0, colonIndex).trim();
		const value = trimmedLine.substring(colonIndex + 1).trim();

		mapTransactionFieldForDocker(currentTransaction, key, value);
	}

	if (Object.keys(currentTransaction).length > 0) {
		transactions.push(currentTransaction);
	}

	return transactions;
}

function mapTransactionFieldForDocker(transaction: any, key: string, value: string): void {
	const keyLower = key.toLowerCase();
	
	if (keyLower.includes('value_value') || keyLower.includes('amount')) {
		transaction.amount = parseFloat(value.replace(',', '.'));
	} else if (keyLower.includes('value_currency') || keyLower.includes('currency')) {
		transaction.currency = value;
	} else if (keyLower.includes('date') || keyLower.includes('valutadate')) {
		transaction.date = value;
	} else if (keyLower.includes('remotename') || keyLower.includes('name')) {
		transaction.remoteName = value;
	} else if (keyLower.includes('purpose') || keyLower.includes('memo') || keyLower.includes('reference')) {
		transaction.purpose = value;
	} else if (keyLower.includes('remoteiban') || keyLower.includes('iban')) {
		transaction.remoteIBAN = value;
	} else if (keyLower.includes('remotebic') || keyLower.includes('bic')) {
		transaction.remoteBIC = value;
	} else if (keyLower.includes('transactioncode') || keyLower.includes('code')) {
		transaction.transactionCode = value;
	}
}
