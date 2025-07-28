import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';
import { spawn } from 'child_process';

export class AqBanking implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AqBanking',
		name: 'aqBanking',
		icon: 'fa:university',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Interact with German banks using AqBanking',
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
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get Balance',
						value: 'getBalance',
						action: 'Get the balance of an account',
					},
				],
				default: 'getBalance',
			},
			{
				displayName: 'Account Number',
				name: 'accountNumber',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['getBalance'],
					},
				},
				description: 'The bank account number to query',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i, '') as string;
			const accountNumber = this.getNodeParameter('accountNumber', i, '') as string;
			const credentials = await this.getCredentials('aqBankingCredentials');

		if (operation === 'getBalance') {
			try {
				const result = await executeAqBankingMethod(
					credentials.userId as string,
					credentials.pin as string,
					accountNumber,
					this,
				);
				returnData.push({ json: result, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}
		}

		return [returnData];
	}

}

async function executeAqBankingMethod(userId: string, pin: string, accountNumber: string, context: IExecuteFunctions): Promise<{ balance: number; currency: string }> {
		return new Promise((resolve, reject) => {
			const args = ['--noninteractive', 'request', '--balance', `--user=${userId}`, `-a=${accountNumber}`];
			const aqBankingProcess = spawn('aqbanking-cli', args);

			let stdout = '';
			let stderr = '';

			aqBankingProcess.stdout.on('data', (data) => (stdout += data.toString()));
			aqBankingProcess.stderr.on('data', (data) => (stderr += data.toString()));

			aqBankingProcess.on('close', (code) => {
				if (code !== 0) return reject(new NodeOperationError(context.getNode(), `AqBanking exited with code ${code}: ${stderr}`));
				const balanceRegex = /Balance\s*:\s*([\d,.-]+)\s*([A-Z]{3})/;
				const match = stdout.match(balanceRegex);
				if (!match) return reject(new NodeOperationError(context.getNode(), `Could not parse balance from AqBanking output. Output: ${stdout}`));
				const balanceString = match[1].replace(/\./g, '').replace(',', '.');
				const balance = parseFloat(balanceString);
				if (isNaN(balance)) return reject(new NodeOperationError(context.getNode(), `Failed to parse balance value: ${match[1]}`));
				resolve({ balance, currency: match[2] });
			});

			aqBankingProcess.stdin.write(pin + '\n');
			aqBankingProcess.stdin.end();
		});
}
