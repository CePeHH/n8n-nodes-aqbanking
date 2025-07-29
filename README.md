# n8n-nodes-aqbanking

An n8n community node to interact with German banks using AqBanking.

![n8n.io - Workflow Automation](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png)

## Installation

**Wichtiger Hinweis**: Diese n8n-Node benötigt das Kommandozeilen-Tool `aqbanking-tools` auf dem System, auf dem Ihre n8n-Instanz läuft. Ohne dieses Tool kann die Node nicht funktionieren, da sie es zur Kommunikation mit den Banken verwendet. Aktuell ist mir keine Methode bekannt, die Node ohne die Installation von `aqbanking-tools` zu betreiben. Die Einrichtung kann je nach Umgebung (z.B. Docker) länger dauern. Detaillierte Installationsanweisungen finden Sie im Abschnitt "Prerequisites".

### Community Nodes (Recommended)

For users on n8n v0.187+, your instance owner can install this node from **Community Nodes**.

1. Go to **Settings > Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-aqbanking` in **Enter npm package name**.
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes: select **I understand the risks of installing unverified code from a public source**.
5. Select **Install**.

After installing the node, you can use it like any other node. n8n runs `npm install` in the background.

### Manual installation

To get started install the package in your n8n root directory:

```bash
npm install n8n-nodes-aqbanking
```

For Docker-based deployments, you need to ensure `aqbanking-tools` is installed within your container. You can do this by creating a custom Dockerfile based on the official n8n image:

**Dockerfile Example:**
```dockerfile
# Use the official n8n image as a base
FROM n8nio/n8n:latest

# Switch to root user to install system packages
USER root

# Install AqBanking tools
RUN apt-get update && apt-get install -y aqbanking-tools && rm -rf /var/lib/apt/lists/*

# Install the community node
RUN cd /usr/local/lib/node_modules/n8n && npm install n8n-nodes-aqbanking

# Switch back to the node user
USER node
```

Build and run this custom image instead of the standard one.

### Manual installation

To get started install the package in your n8n root directory:

```bash
npm install n8n-nodes-aqbanking
```

## Prerequisites

This node requires AqBanking to be installed on your system. If you are not using Docker, you can install it with one of the following commands:

### Ubuntu/Debian
```bash
sudo apt-get install aqbanking-tools
```

### CentOS/RHEL/Fedora
```bash
sudo yum install aqbanking-tools
# or
sudo dnf install aqbanking-tools
```

### macOS
```bash
brew install aqbanking
```

You also need to set up your bank connection using AqBanking's setup tools before using this node.

## Configuration

### Setting up AqBanking

1. **Add your bank**: Use `aqhbci-tool4` to add your bank and user configuration
2. **Get user ID**: Run `aqbanking-cli listusers` to get your numeric user ID
3. **Test connection**: Verify your setup works with `aqbanking-cli request --balance`

### Credentials

The node requires the following credentials:

- **AqBanking User ID**: The numeric user ID from `aqbanking-cli listusers`
- **PIN**: Your online banking PIN

## Operations

### Get Balance

Retrieves the current balance of a specified bank account.

**Parameters:**
- **Account Number**: The bank account number to query

**Output:**
```json
{
  "balance": 1234.56,
  "currency": "EUR"
}
```

### Get Transactions

Retrieves the transaction history for a specified bank account within a given date range.

**Parameters:**
- **Account Number**: The bank account number to query
- **Start Date**: The start date for the transaction query (YYYY-MM-DD)
- **End Date**: The end date for the transaction query (YYYY-MM-DD)

**Output:**
```json
{
  "transactions": [
    {
      "date": "2023-10-27",
      "amount": -50.00,
      "currency": "EUR",
      "remoteName": "REWE",
      "purpose": "Einkauf"
    },
    {
      "date": "2023-10-26",
      "amount": 1200.00,
      "currency": "EUR",
      "remoteName": "Arbeitgeber",
      "purpose": "Gehalt"
    }
  ]
}
```

## Usage Example

1. Add the AqBanking node to your workflow
2. Configure your AqBanking credentials
3. Select the desired operation ("Get Balance" or "Get Transactions")
4. Enter the required parameters for the selected operation
5. Execute the workflow

The node will return the current balance and currency for the specified account.

## Compatibility

- **n8n version**: 0.187.0 or higher
- **Node.js**: 16.x or higher
- **AqBanking**: 6.x or higher

## Security Notes

- Your banking credentials are securely stored in n8n's credential system
- The PIN is encrypted and never logged
- All communication with AqBanking happens locally on your system
- No banking data is transmitted to external services

## Troubleshooting

### Common Issues

**"aqbanking-cli command not found"**
- Make sure AqBanking is installed on your system
- Verify `aqbanking-cli` is in your system PATH

**"Authentication failed"**
- Double-check your User ID and PIN
- Ensure your AqBanking setup is complete and working
- Test with `aqbanking-cli request --balance` first

**"Could not parse balance"**
- Your bank might return a different format
- Check the raw output with `aqbanking-cli request --balance`
- Open an issue with the output format for support

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Linting

```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/CePeHH/n8n-nodes-aqbanking/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/CePeHH/n8n-nodes-aqbanking/discussions)
- 📖 **n8n Documentation**: [docs.n8n.io](https://docs.n8n.io)
- 🏦 **AqBanking Documentation**: [AqBanking Wiki](https://wiki.gnucash.org/wiki/AqBanking)

## Disclaimer

This software is provided for educational and development purposes. Always verify transactions and balances through your bank's official channels. The authors are not responsible for any financial losses or damages.

---

**Keywords**: n8n, node, aqbanking, german banks, hbci, fintech, automation, workflow
