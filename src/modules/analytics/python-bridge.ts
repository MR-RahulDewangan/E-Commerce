import { spawn } from 'node:child_process';
import path from 'node:path';

/**
 * Invokes the Python machine learning & analytics engine via stdin/stdout IPC.
 * Includes timeout protection and structured JSON parsing.
 */
export async function invokePythonAnalytics<T>(
  command: 'forecast' | 'churn',
  payload: Record<string, unknown>,
  timeoutMs: number = 8000
): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      const scriptPath = path.resolve(process.cwd(), 'scripts', 'analytics', 'analytics_engine.py');
      const pythonBin = process.platform === 'win32' ? 'python' : 'python3';

      const child = spawn(pythonBin, [scriptPath, command], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdoutData = '';
      let stderrData = '';
      let isSettled = false;

      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            child.kill();
          } catch (_) {}
          console.warn(`[PythonBridge] Execution timed out after ${timeoutMs}ms for command: ${command}`);
          resolve(null);
        }
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      child.on('close', (code) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);

        if (code !== 0) {
          console.error(`[PythonBridge] Python exited with code ${code}: ${stderrData}`);
          resolve(null);
          return;
        }

        try {
          const parsed = JSON.parse(stdoutData.trim()) as T;
          resolve(parsed);
        } catch (parseError) {
          console.error(`[PythonBridge] Failed to parse JSON output:`, stdoutData, parseError);
          resolve(null);
        }
      });

      child.on('error', (err) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);
        console.error(`[PythonBridge] Failed to spawn Python process:`, err);
        resolve(null);
      });

      // Write payload to stdin and close stream
      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    } catch (err) {
      console.error(`[PythonBridge] Invocation error:`, err);
      resolve(null);
    }
  });
}
