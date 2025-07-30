import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';
import { spawn } from 'child_process';
import { NativeFinTSClient, executePythonFinTS, executeDockerFinTS } from './FinTSClient';

export class AqBanking implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AqBanking',
		name: 'aqBanking',
		icon: 'fa:university',
		group: ['productivity'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Interact with German banks using AqBanking (FinTS/HBCI protocol)',
		defaults: {
			name: 'AqBanking',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'aqBankingCredentials',
				required: true,
			},
		],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Account',
						value: 'account',
					},
					{
						name: 'Transaction',
						value: 'transaction',
					},
					{
						name: 'User Management',
						value: 'user',
					},
				],
				default: 'account',
			},
			// Account Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['account'],
					},
				},
				options: [
					{
						name: 'Get Balance',
						value: 'getBalance',
						action: 'Get the balance of an account',
						description: 'Retrieve the current balance of a bank account',
					},
					{
						name: 'List Accounts',
						value: 'listAccounts',
						action: 'List all configured accounts',
						description: 'Get a list of all configured bank accounts',
					},
					{
						name: 'Get Account Info',
						value: 'getAccountInfo',
						action: 'Get detailed account information',
						description: 'Retrieve detailed information about a specific account',
					},
				],
				default: 'getBalance',
			},
			// Transaction Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['transaction'],
					},
				},
				options: [
					{
						name: 'Get Transactions',
						value: 'getTransactions',
						action: 'Get account transactions',
						description: 'Retrieve transaction history for an account',
					},
					{
						name: 'Export Transactions',
						value: 'exportTransactions',
						action: 'Export transactions to CSV',
						description: 'Export transactions in CSV format for further processing',
					},
				],
				default: 'getTransactions',
			},
			// User Management Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['user'],
					},
				},
				options: [
					{
						name: 'List Users',
						value: 'listUsers',
						action: 'List configured users',
						description: 'Get a list of all configured FinTS/HBCI users',
					},
					{
						name: 'Get System ID',
						value: 'getSystemId',
						action: 'Get system ID from bank',
						description: 'Retrieve system ID from the bank server',
					},
					{
						name: 'Get TAN Methods',
						value: 'getTanMethods',
						action: 'Get available TAN methods',
						description: 'Retrieve available TAN methods from the bank',
					},
				],
				default: 'listUsers',
			},
			// Common Parameters
			{
				displayName: 'Account Number/IBAN',
				name: 'accountNumber',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['getBalance', 'getTransactions', 'exportTransactions', 'getAccountInfo'],
					},
				},
				description: 'The bank account number or IBAN to query',
				placeholder: 'DE89370400440532013000 or 532013000',
			},
			{
				displayName: 'Bank Code (BLZ)',
				name: 'bankCode',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['getBalance', 'getTransactions', 'exportTransactions', 'getAccountInfo'],
					},
				},
				description: 'Bank code (BLZ) - only required if using account number instead of IBAN',
				placeholder: '37040044',
			},
			// Transaction specific parameters
			{
				displayName: 'Date Range',
				name: 'dateRange',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['getTransactions', 'exportTransactions'],
					},
				},
				options: [
					{
						name: 'All Available',
						value: 'all',
					},
					{
						name: 'Last 30 Days',
						value: 'last30Days',
					},
					{
						name: 'Last 90 Days',
						value: 'last90Days',
					},
					{
						name: 'Custom Range',
						value: 'custom',
					},
				],
				default: 'last30Days',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				displayOptions: {
					show: {
						operation: ['getTransactions', 'exportTransactions'],
						dateRange: ['custom'],
					},
				},
				description: 'The start date for the transaction query',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				displayOptions: {
					show: {
						operation: ['getTransactions', 'exportTransactions'],
						dateRange: ['custom'],
					},
				},
				description: 'The end date for the transaction query',
			},
			// Advanced Options
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Simplify Output',
						name: 'simplifyOutput',
						type: 'boolean',
						default: true,
						description: 'Whether to simplify the output format for easier processing',
					},
					{
						displayName: 'Include Raw Output',
						name: 'includeRawOutput',
						type: 'boolean',
						default: false,
						description: 'Whether to include the raw AqBanking output in the result',
					},
					{
						displayName: 'Max Results',
						name: 'maxResults',
						type: 'number',
						default: 0,
						description: 'Maximum number of results to return (0 = no limit)',
					},
					{
						displayName: 'Output Format',
						name: 'outputFormat',
						type: 'options',
						displayOptions: {
							show: {
								'/operation': ['exportTransactions'],
							},
						},
						options: [
							{
								name: 'CSV',
								value: 'csv',
							},
							{
								name: 'JSON',
								value: 'json',
							},
						],
						default: 'csv',
						description: 'The format for exported transaction data',
					},
				],
			},
		],
	};

	// eslint-disable-next-line no-unused-vars
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;
			const credentials = await this.getCredentials('aqBankingCredentials');

			try {
				let result: any;

				if (resource === 'account') {
					result = await handleAccountOperations(this, operation, i, credentials);
				} else if (resource === 'transaction') {
					result = await handleTransactionOperations(this, operation, i, credentials);
				} else if (resource === 'user') {
					result = await handleUserOperations(this, operation, i, credentials);
				}

				returnData.push({ 
					json: result, 
					pairedItem: { item: i },
				});

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ 
						json: { 
							error: (error as Error).message,
							operation,
							resource,
						}, 
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

// Helper functions
async function handleAccountOperations(executeFunctions: IExecuteFunctions, operation: string, itemIndex: number, credentials: any): Promise<any> {
	switch (operation) {
		case 'getBalance':
			return getBalance(executeFunctions, itemIndex, credentials);
		case 'listAccounts':
			return listAccounts(executeFunctions, credentials);
		case 'getAccountInfo':
			return getAccountInfo(executeFunctions, itemIndex, credentials);
		default:
			throw new NodeOperationError(executeFunctions.getNode(), `Unknown account operation: ${operation}`);
	}
}

async function handleTransactionOperations(executeFunctions: IExecuteFunctions, operation: string, itemIndex: number, credentials: any): Promise<any> {
	switch (operation) {
		case 'getTransactions':
			return getTransactions(executeFunctions, itemIndex, credentials);
		case 'exportTransactions':
			return exportTransactions(executeFunctions, itemIndex, credentials);
		default:
			throw new NodeOperationError(executeFunctions.getNode(), `Unknown transaction operation: ${operation}`);
	}
}

async function handleUserOperations(executeFunctions: IExecuteFunctions, operation: string, itemIndex: number, credentials: any): Promise<any> {
	switch (operation) {
		case 'listUsers':
			return listUsers(executeFunctions, credentials);
		case 'getSystemId':
			return getSystemId(executeFunctions, credentials);
		case 'getTanMethods':
			return getTanMethods(executeFunctions, credentials);
		default:
			throw new NodeOperationError(executeFunctions.getNode(), `Unknown user operation: ${operation}`);
	}
}

async function getBalance(executeFunctions: IExecuteFunctions, itemIndex: number, credentials: any): Promise<any> {
	const accountNumber = executeFunctions.getNodeParameter('accountNumber', itemIndex, '') as string;
	const bankCode = executeFunctions.getNodeParameter('bankCode', itemIndex, '') as string;
	const additionalOptions = executeFunctions.getNodeParameter('additionalOptions', itemIndex, {}) as any;
	
	if (!accountNumber) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Account number is required for balance query');
	}

	const implementation = credentials.fintsImplementation || 'system';

	switch (implementation) {
		case 'native':
			return getBalanceNative(executeFunctions, itemIndex, credentials, accountNumber, additionalOptions);
		
		case 'python':
			return executePythonFinTS(executeFunctions, 'getBalance', {
				credentials,
				accountNumber,
				bankCode,
				...additionalOptions
			});
		
		case 'docker':
			return executeDockerFinTS(executeFunctions, 'getBalance', {
				credentials,
				accountNumber,
				bankCode,
				...additionalOptions
			});
		
		case 'system':
		default:
			return getBalanceSystem(executeFunctions, itemIndex, credentials, accountNumber, bankCode, additionalOptions);
	}
}

async function getBalanceNative(executeFunctions: IExecuteFunctions, itemIndex: number, credentials: any, accountNumber: string, additionalOptions: any): Promise<any> {
	const client = new NativeFinTSClient(credentials);
	
	try {
		const result = await client.getBalance(accountNumber);
		
		return {
			...result,
			...(additionalOptions.includeRawOutput && { rawOutput: 'Native FinTS implementation - no raw output available' }),
		};
	} finally {
		await client.close();
	}
}

async function getBalanceSystem(executeFunctions: IExecuteFunctions, itemIndex: number, credentials: any, accountNumber: string, bankCode: string, additionalOptions: any): Promise<any> {
	const args = buildBaseArgs(credentials);
	args.push('request', '--balance');
	
	if (bankCode) {
		args.push('-b', bankCode);
	}
	args.push('-a', accountNumber);

	const result = await executeAqBankingCommand(executeFunctions, 'aqbanking-cli', args, credentials);
	const parsed = parseBalanceOutput(executeFunctions, result.stdout);
	
	return {
		...parsed,
		accountNumber,
		bankCode: bankCode || credentials.bankCode,
		timestamp: new Date().toISOString(),
		...(additionalOptions.includeRawOutput && { rawOutput: result.stdout }),
	};
}

async function getTransactions(executeFunctions: IExecuteFunctions, itemIndex: number, credentials: any): Promise<any> {
	const accountNumber = executeFunctions.getNodeParameter('accountNumber', itemIndex, '') as string;
	const bankCode = executeFunctions.getNodeParameter('bankCode', itemIndex, '') as string;
	const dateRange = executeFunctions.getNodeParameter('dateRange', itemIndex, 'last30Days') as string;
	const additionalOptions = executeFunctions.getNodeParameter('additionalOptions', itemIndex, {}) as any;
	
	if (!accountNumber) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Account number is required for transaction query');
	}

	const implementation = credentials.fintsImplementation || 'system';
	const { startDate, endDate } = getDateRange(executeFunctions, dateRange, itemIndex);

	switch (implementation) {
		case 'native':
			return getTransactionsNative(executeFunctions, itemIndex, credentials, accountNumber, startDate, endDate, additionalOptions);
		
		case 'python':
			return executePythonFinTS(executeFunctions, 'getTransactions', {
				credentials,
				accountNumber,
				bankCode,
				startDate,
				endDate,
				...additionalOptions
			});
		
		case 'docker':
			return executeDockerFinTS(executeFunctions, 'getTransactions', {
				credentials,
				accountNumber,
				bankCode,
				startDate,
				endDate,
				...additionalOptions
			});
		
		case 'system':
		default:
			return getTransactionsSystem(executeFunctions, itemIndex, credentials, accountNumber, bankCode, dateRange, additionalOptions);
	}
}

async function getTransactionsNative(executeFunctions: IExecuteFunctions, itemIndex: number, credentials: any, accountNumber: string, startDate: string | undefined, endDate: string | undefined, additionalOptions: any): Promise<any> {
	const client = new NativeFinTSClient(credentials);
	
	try {
		const startDateObj = startDate ? new Date(startDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')) : undefined;
		const endDateObj = endDate ? new Date(endDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')) : undefined;
		
		const result = await client.getTransactions(accountNumber, startDateObj, endDateObj);
		
		// Apply max results limit
		if (additionalOptions.maxResults && additionalOptions.maxResults > 0) {
			result.transactions = result.transactions.slice(0, additionalOptions.maxResults);
			result.count = result.transactions.length;
		}

		return {
			...result,
			dateRange: { startDate, endDate },
			...(additionalOptions.includeRawOutput && { rawOutput: 'Native FinTS implementation - no raw output available' }),
		};
	} finally {
		await client.close();
	}
}

async function getTransactionsSystem(executeFunctions: IExecuteFunctions, itemIndex: number, credentials: any, accountNumber: string, bankCode: string, dateRange: string, additionalOptions: any): Promise<any> {
	const args = buildBaseArgs(credentials);
	args.push('request', '--transactions');
	
	if (bankCode) {
		args.push('-b', bankCode);
	}
	args.push('-a', accountNumber);

	// Handle date range
	const { startDate, endDate } = getDateRange(executeFunctions, dateRange, itemIndex);
	if (startDate) {
		args.push('--fromdate', startDate);
	}
	if (endDate) {
		args.push('--todate', endDate);
	}

	const result = await executeAqBankingCommand(executeFunctions, 'aqbanking-cli', args, credentials);
	let transactions = parseTransactionOutput(result.stdout);
	
	// Apply max results limit
	if (additionalOptions.maxResults && additionalOptions.maxResults > 0) {
		transactions = transactions.slice(0, additionalOptions.maxResults);
	}

	return {
		transactions,
		count: transactions.length,
		accountNumber,
		bankCode: bankCode || credentials.bankCode,
		dateRange: { startDate, endDate },
		timestamp: new Date().toISOString(),
		...(additionalOptions.includeRawOutput && { rawOutput: result.stdout }),
	};
}

async function exportTransactions(executeFunctions: IExecuteFunctions, itemIndex: number, credentials: any): Promise<any> {
	const additionalOptions = executeFunctions.getNodeParameter('additionalOptions', itemIndex, {}) as any;
	const outputFormat = additionalOptions.outputFormat || 'csv';
	
	// Get transactions first
	const transactionData = await getTransactions(executeFunctions, itemIndex, credentials);
	
	if (outputFormat === 'csv') {
		const csvData = convertTransactionsToCsv(transactionData.transactions);
		return {
			...transactionData,
			csvData,
			format: 'csv',
		};
	}
	
	return {
		...transactionData,
		format: 'json',
	};
}

async function listAccounts(executeFunctions: IExecuteFunctions, credentials: any): Promise<any> {
	const args = ['listaccounts'];
	const result = await executeAqBankingCommand(executeFunctions, 'aqhbci-tool4', args, credentials);
	
	return {
		accounts: parseAccountListOutput(result.stdout),
		timestamp: new Date().toISOString(),
	};
}

async function getAccountInfo(executeFunctions: IExecuteFunctions, itemIndex: number, credentials: any): Promise<any> {
	const accountNumber = executeFunctions.getNodeParameter('accountNumber', itemIndex, '') as string;
	
	if (!accountNumber) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Account number is required');
	}

	// Get account list and find the specific account
	const accountsResult = await listAccounts(executeFunctions, credentials);
	const account = accountsResult.accounts.find((acc: any) => 
		acc.accountNumber === accountNumber || acc.iban === accountNumber
	);

	if (!account) {
		throw new NodeOperationError(executeFunctions.getNode(), `Account ${accountNumber} not found`);
	}

	return {
		...account,
		timestamp: new Date().toISOString(),
	};
}

async function listUsers(executeFunctions: IExecuteFunctions, credentials: any): Promise<any> {
	const args = ['listusers'];
	const result = await executeAqBankingCommand(executeFunctions, 'aqhbci-tool4', args, credentials);
	
	return {
		users: parseUserListOutput(result.stdout),
		timestamp: new Date().toISOString(),
	};
}

async function getSystemId(executeFunctions: IExecuteFunctions, credentials: any): Promise<any> {
	const args = buildHbciArgs(credentials);
	args.push('getsysid');
	
	const result = await executeAqBankingCommand(executeFunctions, 'aqhbci-tool4', args, credentials);
	
	return {
		systemId: parseSystemIdOutput(result.stdout),
		timestamp: new Date().toISOString(),
	};
}

async function getTanMethods(executeFunctions: IExecuteFunctions, credentials: any): Promise<any> {
	const args = buildHbciArgs(credentials);
	args.push('getitanmodes');
	
	const result = await executeAqBankingCommand(executeFunctions, 'aqhbci-tool4', args, credentials);
	
	return {
		tanMethods: parseTanMethodsOutput(result.stdout),
		timestamp: new Date().toISOString(),
	};
}

// Helper methods for building command arguments
function buildBaseArgs(credentials: any): string[] {
	const args: string[] = [];
	
	if (credentials.nonInteractive) {
		args.push('--noninteractive');
	}
	
	// Add server URL if provided
	if (credentials.serverUrl) {
		args.push('--url', credentials.serverUrl);
	}
	
	return args;
}

function buildHbciArgs(credentials: any): string[] {
	const args: string[] = [];
	
	if (credentials.userId) {
		args.push('-u', credentials.userId);
	}
	
	// Add server URL if provided
	if (credentials.serverUrl) {
		args.push('--url', credentials.serverUrl);
	}
	
	return args;
}

// Date range calculation
function getDateRange(executeFunctions: IExecuteFunctions, dateRange: string, itemIndex: number): { startDate?: string; endDate?: string } {
	const now = new Date();
	
	switch (dateRange) {
		case 'all':
			return {};
		case 'last30Days': {
			const thirtyDaysAgo = new Date(now);
			thirtyDaysAgo.setDate(now.getDate() - 30);
			return {
				startDate: formatDate(thirtyDaysAgo),
				endDate: formatDate(now),
			};
		}
		case 'last90Days': {
			const ninetyDaysAgo = new Date(now);
			ninetyDaysAgo.setDate(now.getDate() - 90);
			return {
				startDate: formatDate(ninetyDaysAgo),
				endDate: formatDate(now),
			};
		}
		case 'custom': {
			const startDate = executeFunctions.getNodeParameter('startDate', itemIndex, '') as string;
			const endDate = executeFunctions.getNodeParameter('endDate', itemIndex, '') as string;
			return {
				startDate: startDate ? formatDate(new Date(startDate)) : undefined,
				endDate: endDate ? formatDate(new Date(endDate)) : undefined,
			};
		}
		default:
			return {};
	}
}

function formatDate(date: Date): string {
	return date.toISOString().split('T')[0].replace(/-/g, '');
}

// Command execution
async function executeAqBankingCommand(executeFunctions: IExecuteFunctions, command: string, args: string[], credentials: any): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		if (credentials.enableDebugLogging) {
			process.env.GWEN_LOGLEVEL = 'info';
			process.env.AQBANKING_LOGLEVEL = 'info';
			process.env.AQHBCI_LOGLEVEL = 'info';
		}

		const childProcess = spawn(command, args, {
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';

		childProcess.stdout.on('data', (data) => {
			stdout += data.toString();
		});

		childProcess.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		childProcess.on('close', (code) => {
			if (code !== 0) {
				reject(new NodeOperationError(executeFunctions.getNode(), 
					`${command} exited with code ${code}. Error: ${stderr}`
				));
				return;
			}
			resolve({ stdout, stderr });
		});

		childProcess.on('error', (error) => {
			reject(new NodeOperationError(executeFunctions.getNode(), 
				`Failed to execute ${command}: ${error.message}`
			));
		});

		// Send PIN if needed (for non-interactive mode, this should be set up via mkpinlist)
		if (credentials.pin && !credentials.nonInteractive) {
			childProcess.stdin.write(credentials.pin + '\n');
		}
		childProcess.stdin.end();
	});
}

// Output parsing methods
function parseBalanceOutput(_executeFunctions: IExecuteFunctions, output: string): { balance: number; currency: string } {
	// Try multiple regex patterns for different output formats
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

	throw new NodeOperationError(_executeFunctions.getNode(), 
		`Could not parse balance from AqBanking output. Output: ${output}`
	);
}

function parseTransactionOutput(output: string): any[] {
	const transactions: any[] = [];
	const lines = output.split('\n');
	let currentTransaction: any = {};

	for (const line of lines) {
		const trimmedLine = line.trim();
		
		if (trimmedLine.startsWith('transaction ') || trimmedLine.startsWith('Transaction ')) {
			if (Object.keys(currentTransaction).length > 0) {
				transactions.push(cleanTransaction(currentTransaction));
			}
			currentTransaction = {};
			continue;
		}

		const colonIndex = trimmedLine.indexOf(':');
		if (colonIndex === -1) continue;

		const key = trimmedLine.substring(0, colonIndex).trim();
		const value = trimmedLine.substring(colonIndex + 1).trim();

		// Map various field names to standardized properties
		mapTransactionField(currentTransaction, key, value);
	}

	if (Object.keys(currentTransaction).length > 0) {
		transactions.push(cleanTransaction(currentTransaction));
	}

	return transactions;
}

function mapTransactionField(transaction: any, key: string, value: string): void {
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

function cleanTransaction(transaction: any): any {
	// Ensure required fields have default values
	return {
		amount: transaction.amount || 0,
		currency: transaction.currency || 'EUR',
		date: transaction.date || '',
		remoteName: transaction.remoteName || '',
		purpose: transaction.purpose || '',
		remoteIBAN: transaction.remoteIBAN || '',
		remoteBIC: transaction.remoteBIC || '',
		transactionCode: transaction.transactionCode || '',
		...transaction,
	};
}

function parseAccountListOutput(output: string): any[] {
	const accounts: any[] = [];
	const lines = output.split('\n');
	let currentAccount: any = {};

	for (const line of lines) {
		const trimmedLine = line.trim();
		
		if (trimmedLine.startsWith('Account ') || trimmedLine.startsWith('Konto ')) {
			if (Object.keys(currentAccount).length > 0) {
				accounts.push(currentAccount);
			}
			currentAccount = {};
			continue;
		}

		const colonIndex = trimmedLine.indexOf(':');
		if (colonIndex === -1) continue;

		const key = trimmedLine.substring(0, colonIndex).trim().toLowerCase();
		const value = trimmedLine.substring(colonIndex + 1).trim();

		if (key.includes('number') || key.includes('nummer')) {
			currentAccount.accountNumber = value;
		} else if (key.includes('iban')) {
			currentAccount.iban = value;
		} else if (key.includes('bic') || key.includes('blz')) {
			currentAccount.bic = value;
		} else if (key.includes('name') || key.includes('owner')) {
			currentAccount.accountName = value;
		} else if (key.includes('bank')) {
			currentAccount.bankName = value;
		}
	}

	if (Object.keys(currentAccount).length > 0) {
		accounts.push(currentAccount);
	}

	return accounts;
}

function parseUserListOutput(output: string): any[] {
	const users: any[] = [];
	const lines = output.split('\n');
	let currentUser: any = {};

	for (const line of lines) {
		const trimmedLine = line.trim();
		
		if (trimmedLine.startsWith('User ') || trimmedLine.startsWith('Benutzer ')) {
			if (Object.keys(currentUser).length > 0) {
				users.push(currentUser);
			}
			currentUser = {};
			continue;
		}

		const colonIndex = trimmedLine.indexOf(':');
		if (colonIndex === -1) continue;

		const key = trimmedLine.substring(0, colonIndex).trim().toLowerCase();
		const value = trimmedLine.substring(colonIndex + 1).trim();

		if (key.includes('id') || key.includes('userid')) {
			currentUser.userId = value;
		} else if (key.includes('name')) {
			currentUser.userName = value;
		} else if (key.includes('bank') || key.includes('blz')) {
			currentUser.bankCode = value;
		}
	}

	if (Object.keys(currentUser).length > 0) {
		users.push(currentUser);
	}

	return users;
}

function parseSystemIdOutput(output: string): string {
	const match = output.match(/System.*ID.*:\s*([^\s\n]+)/i);
	return match ? match[1] : '';
}

function parseTanMethodsOutput(output: string): any[] {
	const methods: any[] = [];
	const lines = output.split('\n');

	for (const line of lines) {
		const match = line.match(/(\d+):\s*(.+)/);
		if (match) {
			methods.push({
				id: match[1],
				name: match[2].trim(),
			});
		}
	}

	return methods;
}

function convertTransactionsToCsv(transactions: any[]): string {
	if (transactions.length === 0) {
		return 'Date,Amount,Currency,Remote Name,Purpose,Remote IBAN,Remote BIC,Transaction Code\n';
	}

	const headers = ['Date', 'Amount', 'Currency', 'Remote Name', 'Purpose', 'Remote IBAN', 'Remote BIC', 'Transaction Code'];
	const csvRows = [headers.join(',')];

	for (const transaction of transactions) {
		const row = [
			transaction.date || '',
			transaction.amount || 0,
			transaction.currency || '',
			escapeCsvField(transaction.remoteName || ''),
			escapeCsvField(transaction.purpose || ''),
			transaction.remoteIBAN || '',
			transaction.remoteBIC || '',
			transaction.transactionCode || '',
		];
		csvRows.push(row.join(','));
	}

	return csvRows.join('\n');
}

function escapeCsvField(field: string): string {
	if (field.includes(',') || field.includes('"') || field.includes('\n')) {
		return `"${field.replace(/"/g, '""')}"`;
	}
	return field;
}
