/**
 * Pipelines API Route
 * GET /api/pipelines - List all available pipeline configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllPipelines } from '@/services/pipelines/registry';

/**
 * GET /api/pipelines
 * Returns all registered pipeline configurations
 *
 * Response includes basic pipeline info (key, name, version, stages)
 * without full field definitions and permissions
 */
export async function GET(req: NextRequest) {
  try {
    // Get all pipelines from registry
    const pipelines = getAllPipelines();

    // Map to summary format
    const pipelineSummaries = pipelines.map((pipeline) => ({
      key: pipeline.key,
      name: pipeline.name,
      version: pipeline.version,
      description: pipeline.description,
      stages: pipeline.stages.map((stage) => ({
        key: stage.key,
        name: stage.name,
        description: stage.description,
        color: stage.color,
        icon: stage.icon,
        estimatedDuration: stage.estimatedDuration
      })),
      stageCount: pipeline.stages.length,
      fieldCount: pipeline.fieldDefinitions.length,
      metadata: pipeline.metadata
    }));

    return NextResponse.json({
      success: true,
      pipelines: pipelineSummaries,
      count: pipelineSummaries.length
    });
  } catch (error) {
    console.error('Error in GET /api/pipelines:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
