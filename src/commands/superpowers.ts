import { Command } from 'commander';
import chalk from 'chalk';
import { detectSuperpowers } from '../core/superpowers-detection.js';
import { getGlobalConfig, saveGlobalConfig } from '../core/global-config.js';

export function registerSuperpowersCommand(program: Command): void {
  const superpowers = program
    .command('superpowers')
    .description('Manage Superpowers integration');

  superpowers
    .command('setup')
    .description('Detect and apply Superpowers enhancements to generated skills')
    .action(async () => {
      const detection = detectSuperpowers();

      if (!detection.installed) {
        console.log(chalk.dim('Superpowers not found. Install it to enable enhanced skills.'));
        console.log(chalk.dim('See: https://www.superpowers.ai'));
        return;
      }

      console.log(chalk.green(`Superpowers detected: ${detection.installPath}`));
      console.log(chalk.dim('Run: openspec update to regenerate skills with Superpowers enhancements.'));
    });

  superpowers
    .command('status')
    .description('Show Superpowers integration status')
    .action(() => {
      const detection = detectSuperpowers();
      const config = getGlobalConfig();
      const optedOut = config.superpowers?.enabled === false;

      if (!detection.installed) {
        console.log(chalk.yellow('Superpowers: not installed'));
        console.log(chalk.dim('Install Superpowers to enable enhanced OpenSpec skills.'));
        return;
      }

      console.log(chalk.green(`Superpowers: installed`));
      console.log(`  Path: ${detection.installPath}`);
      if (optedOut) {
        console.log(chalk.yellow('  Status: disabled (run: openspec superpowers enable)'));
      } else {
        console.log(chalk.green('  Status: enabled'));
      }
    });

  superpowers
    .command('enable')
    .description('Enable Superpowers integration')
    .action(() => {
      const config = getGlobalConfig();
      saveGlobalConfig({ ...config, superpowers: { ...config.superpowers, enabled: true } });
      console.log(chalk.green('Superpowers integration enabled.'));
      console.log(chalk.dim('Run: openspec update to apply.'));
    });

  superpowers
    .command('disable')
    .description('Disable Superpowers integration')
    .action(() => {
      const config = getGlobalConfig();
      saveGlobalConfig({ ...config, superpowers: { ...config.superpowers, enabled: false } });
      console.log(chalk.yellow('Superpowers integration disabled.'));
      console.log(chalk.dim('Run: openspec update to apply.'));
    });
}
