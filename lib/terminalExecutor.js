/**
 * Terminal Executor - Safely execute terminal commands with restrictions
 * Provides command validation, logging, and sandboxing
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, appendFile } from "node:fs/promises";
import { resolve } from "node:path";

const execAsync = promisify(exec);

// Workspace root directory
const WORKSPACE_DIR = process.cwd();

// Command execution log
const LOG_FILE = "sessions/terminal-commands.log";

/**
 * Dangerous commands that are ALWAYS blocked
 */
const DANGEROUS_COMMANDS = [
  /rm\s+-rf/,           // rm -rf (recursive force delete)
  /rm\s+-fr/,           // rm -fr (recursive force delete)
  /dd\s+if=/,           // dd (disk destroyer)
  /mkfs/,               // mkfs (format filesystem)
  /fdisk/,              // fdisk (partition tool)
  />.*\/dev\//,         // Writing to devices
  /\|\s*sh/,            // Piping to shell
  /curl.*\|\s*bash/,    // curl pipe to bash
  /wget.*\|\s*bash/,    // wget pipe to bash
  /sudo/,               // sudo (privilege escalation)
  /su\s/,               // su (switch user)
  /chmod\s+777/,        // chmod 777 (insecure permissions)
  /eval/,               // eval (code execution)
  /import\s+os/,        // Python os module (can be dangerous)
  /system\(/,           // system() calls
  /exec\(/              // exec() calls
];

/**
 * Commands that require explicit approval even if otherwise safe
 */
const WRITE_COMMANDS = [
  />/,                  // Output redirection
  />>/,                 // Append redirection
  /echo.*>/,            // echo to file
  /cat.*>/,             // cat to file
  /tee/,                // tee (write)
  /sed\s+-i/,           // sed in-place edit
  /git\s+commit/,       // git commit
  /git\s+push/,         // git push
  /npm\s+install/,      // npm install (modifies node_modules)
  /npm\s+i\s/,          // npm i (shorthand)
  /yarn\s+add/,         // yarn add
  /mv\s/,               // mv (move/rename)
  /cp\s.*>\s/           // copy with redirect
];

/**
 * Safe read-only commands (can auto-execute in future)
 */
const SAFE_READ_COMMANDS = [
  /^cat\s/,             // cat (read file)
  /^ls\s/,              // ls (list directory)
  /^ls$/,               // ls (no args)
  /^grep\s/,            // grep (search)
  /^find\s/,            // find (search files)
  /^wc\s/,              // wc (word count)
  /^head\s/,            // head (first lines)
  /^tail\s/,            // tail (last lines)
  /^git\s+status/,      // git status
  /^git\s+log/,         // git log
  /^git\s+diff/,        // git diff
  /^pwd$/,              // pwd (print directory)
  /^which\s/,           // which (find command)
  /^node\s+--version/,  // node version
  /^npm\s+--version/    // npm version
];

/**
 * Check if command is dangerous
 */
function isDangerousCommand(command) {
  return DANGEROUS_COMMANDS.some(pattern => pattern.test(command));
}

/**
 * Check if command is a write operation
 */
function isWriteCommand(command) {
  return WRITE_COMMANDS.some(pattern => pattern.test(command));
}

/**
 * Check if command is safe read-only
 */
function isSafeReadCommand(command) {
  return SAFE_READ_COMMANDS.some(pattern => pattern.test(command));
}

/**
 * Log command execution
 */
async function logCommand(userId, command, status, output = "", error = "") {
  const timestamp = new Date().toISOString();
  const logEntry = JSON.stringify({
    timestamp,
    userId,
    command,
    status,
    output: output.substring(0, 500), // Truncate long output
    error: error.substring(0, 500)
  }) + "\n";
  
  try {
    await appendFile(LOG_FILE, logEntry, "utf-8");
  } catch (err) {
    console.error("[TerminalExecutor] Failed to log command:", err.message);
  }
}

/**
 * Validate and categorize command
 */
export function validateCommand(command) {
  // Check if dangerous
  if (isDangerousCommand(command)) {
    return {
      valid: false,
      dangerous: true,
      reason: "This command is blocked for security reasons",
      autoExecute: false
    };
  }
  
  // Check if write operation
  if (isWriteCommand(command)) {
    return {
      valid: true,
      dangerous: false,
      requiresApproval: true,
      reason: "This command modifies files or state",
      autoExecute: false
    };
  }
  
  // Check if safe read
  if (isSafeReadCommand(command)) {
    return {
      valid: true,
      dangerous: false,
      requiresApproval: true, // Still require approval for now
      reason: "Safe read-only command",
      autoExecute: false // Can be changed to true in future
    };
  }
  
  // Unknown command - require approval
  return {
    valid: true,
    dangerous: false,
    requiresApproval: true,
    reason: "Command requires approval",
    autoExecute: false
  };
}

/**
 * Execute command with restrictions
 */
export async function executeCommand(userId, command) {
  const validation = validateCommand(command);
  
  // Block dangerous commands
  if (validation.dangerous) {
    await logCommand(userId, command, "BLOCKED", "", validation.reason);
    return {
      success: false,
      blocked: true,
      error: validation.reason
    };
  }
  
  try {
    // Execute in workspace directory with timeout
    const { stdout, stderr } = await execAsync(command, {
      cwd: WORKSPACE_DIR,
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    });
    
    await logCommand(userId, command, "SUCCESS", stdout, stderr);
    
    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      command
    };
  } catch (error) {
    await logCommand(userId, command, "ERROR", "", error.message);
    
    return {
      success: false,
      error: error.message,
      stderr: error.stderr || "",
      stdout: error.stdout || "",
      command
    };
  }
}

/**
 * Format execution result for display
 */
export function formatExecutionResult(result) {
  if (result.blocked) {
    return `**❌ Command Blocked**

**Reason:** ${result.error}

This command is not allowed for security reasons.`;
  }
  
  if (!result.success) {
    return `**❌ Command Failed**

**Command:** \`${result.command}\`
**Error:** ${result.error}

${result.stderr ? `**Stderr:**\n\`\`\`\n${result.stderr}\n\`\`\`` : ''}`;
  }
  
  let response = `**✅ Command Executed Successfully**\n\n`;
  response += `**Command:** \`${result.command}\`\n\n`;
  
  if (result.stdout) {
    // Truncate very long output
    const output = result.stdout.length > 3000 
      ? result.stdout.substring(0, 3000) + "\n\n...(output truncated)"
      : result.stdout;
    response += `**Output:**\n\`\`\`\n${output}\n\`\`\``;
  } else {
    response += `**Output:** (no output)`;
  }
  
  if (result.stderr && result.stderr.length > 0) {
    response += `\n\n**Warnings:**\n\`\`\`\n${result.stderr}\n\`\`\``;
  }
  
  return response;
}

export default {
  validateCommand,
  executeCommand,
  formatExecutionResult
};
