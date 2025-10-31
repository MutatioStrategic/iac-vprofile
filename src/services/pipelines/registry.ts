/**
 * Pipeline Registry
 * Central registry for all pipeline configurations
 */

import type { PipelineConfig } from '@/types/pipeline.types';
import { insolvencyPipelineConfig } from './insolvency/insolvencyConfig';
import { validatePipelineConfig } from '@/lib/schemas/pipelineConfig.schema';

/**
 * Registry of all available pipelines
 */
const pipelineRegistry = new Map<string, PipelineConfig>();

/**
 * Register a pipeline configuration
 * Validates config before registration
 */
export function registerPipeline(config: PipelineConfig): void {
  // Validate config structure
  try {
    validatePipelineConfig(config);
  } catch (error) {
    console.error(`Failed to validate pipeline config for ${config.key}:`, error);
    throw new Error(`Invalid pipeline config: ${config.key}`);
  }

  // Check for duplicate
  if (pipelineRegistry.has(config.key)) {
    console.warn(`Overwriting pipeline: ${config.key}`);
  }

  pipelineRegistry.set(config.key, config);
  console.log(`✅ Registered pipeline: ${config.key} v${config.version}`);
}

/**
 * Get pipeline configuration by key
 * @throws Error if pipeline not found
 */
export function getPipeline(key: string): PipelineConfig | undefined {
  return pipelineRegistry.get(key);
}

/**
 * Get pipeline configuration by key (throws if not found)
 */
export function getPipelineOrThrow(key: string): PipelineConfig {
  const pipeline = pipelineRegistry.get(key);
  if (!pipeline) {
    throw new Error(`Pipeline not found: ${key}`);
  }
  return pipeline;
}

/**
 * Get all registered pipelines
 */
export function getAllPipelines(): PipelineConfig[] {
  return Array.from(pipelineRegistry.values());
}

/**
 * Check if pipeline exists
 */
export function hasPipeline(key: string): boolean {
  return pipelineRegistry.has(key);
}

/**
 * Get pipeline version
 */
export function getPipelineVersion(key: string): string | undefined {
  return pipelineRegistry.get(key)?.version;
}

/**
 * Get list of all pipeline keys
 */
export function getPipelineKeys(): string[] {
  return Array.from(pipelineRegistry.keys());
}

/**
 * Get pipeline count
 */
export function getPipelineCount(): number {
  return pipelineRegistry.size;
}

/**
 * Clear all pipelines (for testing)
 */
export function clearPipelines(): void {
  pipelineRegistry.clear();
}

// =====================================================
// Auto-register built-in pipelines
// =====================================================

// Register insolvency pipeline
registerPipeline(insolvencyPipelineConfig);

// Register default pipeline (if it exists)
// import { defaultPipelineConfig } from './default/defaultConfig';
// registerPipeline(defaultPipelineConfig);

// Export individual pipelines for direct import
export { insolvencyPipelineConfig };

// Log registered pipelines in development
if (process.env.NODE_ENV === 'development') {
  console.log(`📋 Registered Pipelines (${getPipelineCount()}):`);
  getAllPipelines().forEach((p) => {
    console.log(`   - ${p.key} (${p.name}) v${p.version}`);
  });
}
