#!/usr/bin/env bun

import { $ } from 'bun'
import fs from 'fs'
import { watch } from 'fs/promises'
import chalk from 'chalk'
import readline from 'readline'
import { spawn, ChildProcess } from 'child_process'

// Constants
const RESOLV_CONF_PATH = '/etc/resolv.conf'
const BACKUP_PATH = '/etc/resolv.conf.bak'
const DEFAULT_DNS = '1.1.1.1'
const SECONDARY_DNS = '1.0.0.1'

// Track if we modified the file
let didModify = false

// Helper functions
const isRoot = () => process.getuid?.() === 0

function elevatePrivileges(args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(chalk.yellow('⚠ This program requires root privileges to modify DNS settings'));
    console.log(chalk.yellow('Attempting to restart with sudo...'));

    const execPath = process.argv[0] || '';
    const sudo: ChildProcess = spawn('sudo', [execPath, ...args], {
      stdio: 'inherit',
      detached: false
    });

    sudo.on('error', (error: Error) => {
      console.error(chalk.red(`Failed to elevate privileges: ${error.message}`));
      reject(error);
    });

    sudo.on('exit', (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
      process.exit(0);
    });
  });
}

// Clear console using both methods for maximum compatibility
const clearConsole = () => {
  process.stdout.write('\x1Bc');
  console.clear();
}

async function backupOriginal() {
  if (!fs.existsSync(BACKUP_PATH)) {
    await $`cp ${RESOLV_CONF_PATH} ${BACKUP_PATH}`
    console.log(chalk.green('✓ Original resolv.conf backed up'))
  }
}

// Root check wrapper for functions requiring privileges
function requireRoot(fn: Function) {
  return async (...args: any[]) => {
    if (!isRoot()) {
      console.log(chalk.red('✗ This command requires root privileges'));
      console.log(chalk.yellow('Please restart the program with sudo'));
      return;
    }
    return fn(...args);
  };
}

const modifyDNSWithRoot = requireRoot(async (dnsServer = DEFAULT_DNS) => {
  try {
    await backupOriginal()
    const content = `# Modified by dns-manager\nnameserver ${dnsServer}\nnameserver ${SECONDARY_DNS}`
    fs.writeFileSync(RESOLV_CONF_PATH, content)
    didModify = true
    console.log(chalk.green(`✓ DNS servers set to ${dnsServer} and ${SECONDARY_DNS}`))
  } catch (error: any) {
    console.error(chalk.red('✗ Failed to modify resolv.conf:', error.message))
  }
});

const restoreOriginalWithRoot = requireRoot(async () => {
  if (!fs.existsSync(BACKUP_PATH)) {
    console.log(chalk.yellow('⚠ No backup found to restore'))
    return
  }

  try {
    await $`cp ${BACKUP_PATH} ${RESOLV_CONF_PATH}`
    didModify = false
    console.log(chalk.green('✓ Original resolv.conf restored'))
  } catch (error: any) {
    console.error(chalk.red('✗ Failed to restore resolv.conf:', error.message))
  }
});

async function showStatus() {
  try {
    const content = fs.readFileSync(RESOLV_CONF_PATH, 'utf8')
    const isModified = content.includes('# Modified by dns-manager')

    console.log(chalk.bold('\nCurrent DNS Status:'))
    console.log(chalk.gray('------------------'))
    console.log(content)
    console.log(chalk.gray('------------------'))
    console.log(`Modified by this tool: ${isModified ? chalk.green('Yes') : chalk.red('No')}`)
    console.log(`Backup exists: ${fs.existsSync(BACKUP_PATH) ? chalk.green('Yes') : chalk.red('No')}\n`)
  } catch (error: any) {
    console.error(chalk.red('✗ Failed to read resolv.conf:', error.message))
  }
}

async function watchChanges() {
  console.log(chalk.blue('👀 Watching resolv.conf for changes... (Ctrl+C to stop)'))

  try {
    const watcher = watch(RESOLV_CONF_PATH, { persistent: true })

    let lastContent = fs.readFileSync(RESOLV_CONF_PATH, 'utf8')
    console.log(chalk.gray('Initial content:'))
    console.log(chalk.gray('------------------'))
    console.log(lastContent)
    console.log(chalk.gray('------------------\n'))

    for await (const event of watcher) {
      if (event.eventType === 'change') {
        const newContent = fs.readFileSync(RESOLV_CONF_PATH, 'utf8')

        if (newContent !== lastContent) {
          console.log(chalk.yellow('\n⚠ resolv.conf was modified:'))
          console.log(chalk.gray('------------------'))
          console.log(newContent)
          console.log(chalk.gray('------------------'))
          lastContent = newContent
        }
      }
    }
  } catch (error: any) {
    console.error(chalk.red('✗ Watch failed:', error.message))
  }
}

function displayText(type: 'menu' | 'help') {
  if (type === 'menu') {
    console.log(chalk.bold('\nDNS Manager Menu:'))
    console.log(chalk.gray('-------------------'))
    console.log(`${chalk.blue('1)')} Set DNS to Cloudflare (1.1.1.1)`)
    console.log(`${chalk.blue('2)')} Set DNS to custom IP`)
    console.log(`${chalk.blue('3)')} Restore original DNS settings`)
    console.log(`${chalk.blue('4)')} Show current DNS configuration`)
    console.log(`${chalk.blue('5)')} Watch for changes to resolv.conf`)
    console.log(`${chalk.blue('0)')} Exit`)
    console.log(chalk.gray('\nNote: Options 1-3 require root privileges'))
  } else {
    console.log(chalk.bold('DNS Manager CLI - Usage:'))
    console.log(chalk.gray('-----------------------'))
    console.log('Enter a number to select an option from the menu')
    console.log('Or use the following commands:')
    console.log('  set               : Set DNS to Cloudflare (1.1.1.1)')
    console.log('  set <ip>          : Set DNS to custom IP')
    console.log('  restore           : Restore original DNS settings')
    console.log('  status            : Show current DNS configuration')
    console.log('  watch             : Watch for changes to resolv.conf')
    console.log('  exit              : Exit the program')
    console.log('  help              : Show this help message')
    console.log('  menu              : Display the menu')
  }
}

// Create readline interface
const createInterface = () => readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.blue('Select option [0-5]: ')
});

const askForCustomIP = (rl: readline.Interface): Promise<string> => new Promise(resolve => {
  rl.question(chalk.yellow('Enter custom DNS IP: '), answer => resolve(answer.trim()));
});

// Handle watch mode
async function handleWatchMode() {
  console.log(chalk.yellow('Warning: watch mode will block the interactive prompt.'));
  console.log(chalk.yellow('Press Ctrl+C to return to the prompt.'));
  await new Promise(resolve => setTimeout(resolve, 2000)); // Give time to read the warning
  await watchChanges();
}

// Function to pause if run directly by click
function keepTerminalOpen() {
  // Check if running in GUI environment without terminal
  const isRunFromGUI = !process.stdout.isTTY && !process.env.TERM;

  if (isRunFromGUI) {
    console.log(chalk.yellow('\nTerminal launched from GUI. Press Enter to exit...'));
    // Create a simple readline interface to wait for user input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('', () => {
      rl.close();
      process.exit(0);
    });
  }
}

// Function to process user input
async function processCommand(input: string, rl: readline.Interface) {
  const trimmedInput = input.trim();
  clearConsole();

  // Handle numeric menu selections
  if (/^[0-5]$/.test(trimmedInput)) {
    console.log(chalk.bold(`Selected option: ${trimmedInput}`));
    const option = parseInt(trimmedInput, 10);

    switch (option) {
      case 0: // Exit
        console.log(chalk.green('Goodbye!'));
        return false;
      case 1: // Set DNS to Cloudflare
        await modifyDNSWithRoot();
        break;
      case 2: // Set DNS to custom IP
        const customIP = await askForCustomIP(rl);
        if (customIP) await modifyDNSWithRoot(customIP);
        break;
      case 3: // Restore original
        await restoreOriginalWithRoot();
        break;
      case 4: // Show status
        await showStatus();
        break;
      case 5: // Watch for changes
        await handleWatchMode();
        break;
    }
  } else {
    // Handle text commands
    const [command, ...args] = trimmedInput.split(/\s+/);

    switch (command) {
      case 'set':
        await modifyDNSWithRoot(args.length > 0 ? args[0] : undefined);
        break;
      case 'restore':
        await restoreOriginalWithRoot();
        break;
      case 'status':
        await showStatus();
        break;
      case 'watch':
        await handleWatchMode();
        break;
      case 'exit':
        console.log(chalk.green('Goodbye!'));
        return false;
      case 'help':
      case '--help':
      case '-h':
        displayText('help');
        break;
      case 'menu':
      case '':
        break;
      default:
        console.log(chalk.red(`✗ Unknown command: ${command}`));
        console.log(chalk.gray('Enter a number (0-5) or type "menu" to see options.'));
    }
  }

  // Show menu again after command completes
  displayText('menu');
  return true;
}

// Main
async function main() {
  try {
    clearConsole();

    // Try to make the binary executable
    const execPath = process.argv[0] || '';
    if (execPath && fs.existsSync(execPath)) {
      try { fs.chmodSync(execPath, 0o755); } catch { } // Ignore errors
    }

    // Handle privilege elevation if needed
    const isCompiled = execPath !== '' && !execPath.includes('bun');
    if (isCompiled && !isRoot()) {
      try {
        await elevatePrivileges(process.argv.slice(1));
        return; // Exit after elevation attempt
      } catch {
        console.log(chalk.red('Failed to obtain root privileges. Some features may not work.'));
        console.log(chalk.yellow('Try running with sudo manually: sudo ./dns'));
      }
    }

    // Handle command-line arguments (non-interactive mode)
    if (Bun.argv.length > 2) {
      const rl = createInterface();
      await processCommand(Bun.argv.slice(2).join(' '), rl);
      rl.close();
      keepTerminalOpen(); // Add pause if launched from GUI
      return;
    }

    // Interactive mode
    console.log(chalk.bold('DNS Manager Interactive Mode'));
    console.log(isRoot()
      ? chalk.green('Running with root privileges ✓')
      : chalk.red('Not running as root - some options will not work ✗') +
      '\n' + chalk.yellow('Restart with sudo to enable all features'));

    const rl = createInterface();
    displayText('menu');
    rl.prompt();

    rl.on('line', async (line) => {
      const shouldContinue = await processCommand(line, rl);
      if (!shouldContinue) {
        rl.close();
        return;
      }
      rl.prompt();
    });

    rl.on('close', () => {
      if (didModify) {
        console.log(chalk.yellow('\n⚠ Remember to restore original DNS with option 3 when done'));
      }
      keepTerminalOpen(); // Add pause if launched from GUI
      process.exit(0);
    });
  } catch (error) {
    console.error('Critical error:', error);
    keepTerminalOpen(); // Add pause if launched from GUI
    process.exit(1);
  }
}

// Add cleanup on process exit
process.on('exit', () => {
  if (didModify) {
    console.log(chalk.yellow('\n⚠ Remember to restore original DNS when done'));
  }
})

// Start the program
main()
