import {
	ICredentialType,
	INodeProperties,
	ICredentialTestRequest,
} from 'n8n-workflow';

export class AqBankingCredentials implements ICredentialType {
	name = 'aqBankingCredentials';
	displayName = 'AqBanking FinTS/HBCI Credentials';
	documentationUrl = 'https://github.com/CePeHH/n8n-nodes-aqbanking#configuration';
	icon = 'fa:university' as const;
	
	properties: INodeProperties[] = [
		{
			displayName: 'FinTS Implementation',
			name: 'fintsImplementation',
			type: 'options',
			options: [
				{
					name: 'Native JavaScript (Recommended)',
					value: 'native',
				},
				{
					name: 'Python fints',
					value: 'python',
				},
				{
					name: 'Docker AqBanking',
					value: 'docker',
				},
				{
					name: 'System AqBanking (Legacy)',
					value: 'system',
				},
			],
			default: 'native',
			description: 'Choose the FinTS implementation method. Native JavaScript works without external dependencies.',
		},
		{
			displayName: 'Bank Code (BLZ)',
			name: 'bankCode',
			type: 'string',
			default: '',
			required: true,
			placeholder: '12345678',
			description: 'Your bank\'s routing number (Bankleitzahl). This is an 8-digit number that identifies your bank.',
		},
		{
			displayName: 'User ID (Benutzerkennung)',
			name: 'userId',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'MYUSERID123',
			description: 'Your FinTS/HBCI user identification. This is typically your online banking username. NOT the customer ID.',
		},
		{
			displayName: 'Customer ID (Kunden-ID)',
			name: 'customerId',
			type: 'string',
			default: '',
			placeholder: 'MYCUSTID123',
			description: 'Customer ID (Kunden-ID). Some banks use a separate customer ID that differs from the user ID. Leave empty if not required by your bank.',
		},
		{
			displayName: 'PIN',
			name: 'pin',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your online banking PIN. This will be securely encrypted and stored.',
		},
		{
			displayName: 'FinTS Server URL',
			name: 'serverUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://fints.mybank.de/fints30',
			description: 'The FinTS server URL of your bank. This information can usually be found on your bank\'s website under "FinTS" or "HBCI" documentation.',
		},
		{
			displayName: 'HBCI Version',
			name: 'hbciVersion',
			type: 'options',
			options: [
				{
					name: 'FinTS 3.0 (Recommended)',
					value: '300',
				},
				{
					name: 'FinTS 4.1',
					value: '410',
				},
				{
					name: 'HBCI 2.2',
					value: '220',
				},
			],
			default: '300',
			description: 'The HBCI/FinTS protocol version to use. FinTS 3.0 is recommended for most German banks.',
		},
		{
			displayName: 'TAN Method ID',
			name: 'tanMethodId',
			type: 'string',
			default: '999',
			placeholder: '911',
			description: 'The TAN method ID to use (e.g., 911 for mobileTAN, 920 for photoTAN, 921 for chipTAN QR). Use 999 for PIN/TAN with automatic method detection.',
		},
		{
			displayName: 'TAN Medium Name',
			name: 'tanMediumName',
			type: 'string',
			default: '',
			placeholder: 'Mein iPhone 15 Pro',
			description: 'The exact name of your TAN medium as registered in your online banking (e.g., smartphone name, TAN generator name). Required for most modern TAN methods.',
		},
		{
			displayName: 'Use Non-Interactive Mode',
			name: 'nonInteractive',
			type: 'boolean',
			default: true,
			description: 'Whether to use non-interactive mode. This requires that you have set up a PIN list using aqhbci-tool4 mkpinlist.',
		},
		{
			displayName: 'AqBanking User Name',
			name: 'aqBankingUserName',
			type: 'string',
			default: '',
			placeholder: 'Max Mustermann Girokonto',
			description: 'Optional: A human-readable name for this user configuration in AqBanking (used during setup).',
		},
		{
			displayName: 'Enable Debug Logging',
			name: 'enableDebugLogging',
			type: 'boolean',
			default: false,
			description: 'Whether to enable detailed logging for troubleshooting. WARNING: This may log sensitive information.',
		},
		{
			displayName: 'Python Path',
			name: 'pythonPath',
			type: 'string',
			default: 'python',
			displayOptions: {
				show: {
					fintsImplementation: ['python'],
				},
			},
			placeholder: 'python or /usr/bin/python3',
			description: 'Path to Python executable. Requires python-fints package installed.',
		},
		{
			displayName: 'Docker Image',
			name: 'dockerImage',
			type: 'string',
			default: 'ghcr.io/larsux/aqbanking-docker',
			displayOptions: {
				show: {
					fintsImplementation: ['docker'],
				},
			},
			description: 'Docker image for AqBanking. Default is the community-maintained image.',
		},
	];

	// No real test endpoint available - testing will be done in the node
	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			url: '/test',
		},
	};
}
