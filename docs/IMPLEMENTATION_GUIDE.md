# FinTS Implementation Guide

This n8n-nodes-aqbanking package now supports multiple FinTS implementation methods, allowing you to choose the best option for your environment.

## Implementation Options

### 1. Native JavaScript (Recommended) ✅

**Advantages:**
- No external dependencies
- Works in n8n Cloud
- Fast and efficient
- Modern TAN support
- Cross-platform compatible

**Requirements:**
- None (pure JavaScript/TypeScript)

**Setup:**
1. Select "Native JavaScript (Recommended)" in credentials
2. Enter your bank details
3. Ready to use!

### 2. Python fints

**Advantages:**
- Mature Python implementation
- Extensive feature support
- Well-documented

**Requirements:**
- Python installed on system
- `python-fints` package: `pip install python-fints`

**Setup:**
1. Install Python and python-fints
2. Select "Python fints" in credentials
3. Configure Python path if needed

### 3. Docker AqBanking

**Advantages:**
- Isolated environment
- No local AqBanking installation needed
- Consistent behavior

**Requirements:**
- Docker installed and running
- Internet connection for image download

**Setup:**
1. Install Docker
2. Select "Docker AqBanking" in credentials
3. Configure Docker image if needed (default: ghcr.io/larsux/aqbanking-docker)

### 4. System AqBanking (Legacy)

**Advantages:**
- Full AqBanking feature set
- Proven stability

**Requirements:**
- AqBanking installed on system
- Manual setup of bank connections

**Setup:**
1. Install AqBanking via package manager
2. Configure bank connection with aqhbci-tool4
3. Select "System AqBanking (Legacy)" in credentials

## Feature Comparison

| Feature | Native JS | Python | Docker | System |
|---------|-----------|--------|--------|--------|
| Installation complexity | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| n8n Cloud support | ✅ | ❌ | ❌ | ❌ |
| TAN support | ✅ | ✅ | ✅ | ✅ |
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| Maintenance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

## Troubleshooting

### Native JavaScript Issues

**Error: "Failed to initialize FinTS client"**
- Check server URL format (must include https://)
- Verify bank code (BLZ) is correct
- Ensure credentials are valid

**Error: "Account not found"**
- Use IBAN format: DE89370400440532013000
- Check if account is enabled for FinTS/HBCI

### Python fints Issues

**Error: "python-fints package not installed"**
```bash
pip install python-fints
```

**Error: "Python executable not found"**
- Set correct Python path in credentials
- Use full path: `/usr/bin/python3` or `C:\Python39\python.exe`

### Docker Issues

**Error: "Docker not found"**
- Install Docker Desktop
- Ensure Docker daemon is running

**Error: "Permission denied"**
- Add user to docker group (Linux/macOS)
- Run Docker Desktop as administrator (Windows)

### System AqBanking Issues

**Error: "aqbanking-cli not found"**
```bash
# Ubuntu/Debian
sudo apt install aqbanking-tools

# CentOS/RHEL
sudo yum install aqbanking-tools

# macOS
brew install aqbanking
```

## Migration Guide

### From System AqBanking to Native JavaScript

1. Note your current bank connection settings
2. Change implementation to "Native JavaScript"
3. Enter the same credentials
4. Test connection

No migration of existing AqBanking configuration needed!

## Security Considerations

### Native JavaScript
- Credentials stored encrypted in n8n database
- Direct HTTPS connection to bank
- No external processes

### Python/Docker/System
- Additional processes with access to credentials
- Ensure system security
- Consider network isolation for Docker

## Performance Optimization

### For high-volume usage:
1. Use Native JavaScript implementation
2. Enable connection pooling (automatic)
3. Batch multiple account queries
4. Set appropriate timeouts

### For reliability:
1. Use System AqBanking for production
2. Implement proper error handling
3. Monitor connection health
4. Set up proper logging
