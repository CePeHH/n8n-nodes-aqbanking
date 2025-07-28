import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AqBankingCredentials implements ICredentialType {
	name = 'aqBankingCredentials';
	displayName = 'AqBanking Credentials';
	documentationUrl = 'https://github.com/n8n-io/n8n-nodes-starter'; // Optional: Link to your documentation
	properties: INodeProperties[] = [
		{
			displayName: 'AqBanking User ID',
			name: 'userId',
			type: 'string',
			default: '',
			description: 'The numeric user ID from `aqbanking-cli listusers`',
		},
		{
			displayName: 'PIN',
			name: 'pin',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Your online banking PIN',
		},
	];
}