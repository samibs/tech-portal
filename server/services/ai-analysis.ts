import Anthropic from '@anthropic-ai/sdk';
import { WebApp, AppStatus, LogEntry } from "@shared/schema";
import { RestartRecommendation } from "./recommendation";

// Initialize Anthropic client
// Note: The API key should be set in the environment variable ANTHROPIC_API_KEY
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key-for-development',
});

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const MODEL = 'claude-3-7-sonnet-20250219';

/**
 * Performs AI-powered analysis of app logs and metrics to generate insights and recommendations
 */
export async function analyzeAppWithAI(
  app: WebApp,
  logs: LogEntry[],
  metrics: any,
  existingRecommendation?: RestartRecommendation
): Promise<{
  aiInsights: string[];
  enhancedRecommendation?: Partial<RestartRecommendation>;
}> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        aiInsights: ["AI analysis unavailable - API key not configured"],
      };
    }

    // Extract the most recent logs (last 20)
    const recentLogs = [...logs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 20);

    // Create a structured input for the AI
    const promptData = {
      app: {
        id: app.id,
        name: app.name,
        type: app.type,
        url: app.appUrl,
        status: app.status,
        resourceUsage: app.resourceUsage || 'Unknown',
        lastChecked: app.lastChecked ? new Date(app.lastChecked).toISOString() : 'Never'
      },
      recentLogs: recentLogs.map(log => ({
        timestamp: new Date(log.timestamp).toISOString(),
        action: log.action,
        details: log.details,
        status: log.status
      })),
      metrics: {
        failureRate: metrics.failureRate,
        averageUptime: metrics.averageUptime,
        errorOccurrences: metrics.errorOccurrences,
        statusTransitions: metrics.statusTransitions,
        errorFrequencyTrend: metrics.errorFrequencyTrend,
        memoryLeakLikelihood: metrics.memoryLeakLikelihood,
        performanceDegradation: metrics.performanceDegradation,
        uptimeStability: metrics.uptimeStability,
        errorDensity: metrics.errorDensity
      },
      existingRecommendation: existingRecommendation ? {
        recommendationScore: existingRecommendation.recommendationScore,
        reason: existingRecommendation.reason,
        urgency: existingRecommendation.urgency,
        primaryFactor: existingRecommendation.primaryFactor
      } : null
    };

    // Create a system prompt that instructs Claude how to analyze the data
    const systemPrompt = `You are an AI assistant that specializes in analyzing application monitoring data and providing insights about application health, reliability, and performance. 
    
Your task is to analyze the provided application data, logs, and metrics to generate insights that would help the user understand:
1. The current health state of the application
2. Potential root causes of any issues
3. Patterns or trends that might indicate future problems
4. Specific, actionable recommendations for improving reliability

Provide your insights as a JSON object with the following structure:
{
  "insights": [
    "First insight as a concise sentence",
    "Second insight as a concise sentence",
    ...up to 5 insights
  ],
  "recommendationUpdates": {
    "urgency": "low|medium|high|critical", // only modify if you have high confidence
    "predictedIssues": [
      "First potential issue if not addressed",
      "Second potential issue if not addressed",
      ...up to 3 issues
    ],
    "recommendedTimeWindow": "Specific recommendation about when to restart (e.g., 'Within the next hour', 'During off-peak hours tonight')",
    "recommendationScore": 85 // an integer between 0-100, only include if you have high confidence it should be changed
  }
}

Keep insights concise (15-25 words each) and focused on technical root cause analysis. Be specific about any patterns you identify in error occurrences, performance trends, or resource usage.`;

    // Make the API call to Claude
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: JSON.stringify(promptData, null, 2)
        }
      ],
    });

    // Extract the content from the response
    // The newest version of the Anthropic SDK returns content differently
    const content = response.content[0]?.type === 'text' ? 
      (response.content[0] as { type: 'text', text: string }).text :
      JSON.stringify({insights: ["Could not extract content from AI response"]});
    
    try {
      // Parse the JSON response
      const analysis = JSON.parse(content);
      
      return {
        aiInsights: analysis.insights || [],
        enhancedRecommendation: analysis.recommendationUpdates
      };
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return {
        aiInsights: ["Error processing AI analysis results"],
      };
    }
  } catch (error) {
    console.error("Error during AI analysis:", error);
    return {
      aiInsights: ["AI analysis failed - service temporarily unavailable"],
    };
  }
}

/**
 * Analyzes system-wide metrics and patterns to generate strategic insights
 */
export async function analyzeSystemWithAI(
  apps: WebApp[],
  recentRecommendations: RestartRecommendation[]
): Promise<string[]> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return ["AI system analysis unavailable - API key not configured"];
    }

    const promptData = {
      systemOverview: {
        totalApps: apps.length,
        appsByStatus: {
          running: apps.filter(app => app.status === "Running").length,
          stopped: apps.filter(app => app.status === "Stopped").length,
          unreachable: apps.filter(app => app.status === "Unreachable").length,
          error: apps.filter(app => app.status === "Error").length
        },
        appsByType: {
          frontend: apps.filter(app => app.type === 'Frontend').length,
          backend: apps.filter(app => app.type === 'Backend').length,
          database: apps.filter(app => app.type === 'Database').length,
          other: apps.filter(app => app.type === 'Other').length
        },
        highUrgencyRecommendations: recentRecommendations.filter(
          rec => rec.urgency === 'high' || rec.urgency === 'critical'
        ).length
      },
      recentRecommendations: recentRecommendations.slice(0, 5).map(rec => ({
        appName: rec.appName,
        score: rec.recommendationScore,
        urgency: rec.urgency,
        primaryFactor: rec.primaryFactor
      }))
    };

    // Create a system prompt for system-wide analysis
    const systemPrompt = `You are an AI assistant that specializes in analyzing system-wide application monitoring data and providing strategic insights about the overall health and reliability of a multi-application environment.

Your task is to analyze the provided system data, including information about multiple applications and recent recommendations, to generate 3-5 strategic insights about the health of the overall system.

Focus on identifying:
1. System-wide patterns or trends
2. Potential cascading failures or dependencies
3. Unusual application behavior compared to the system norm
4. Strategic recommendations for improving overall system reliability

Respond ONLY with an array of 3-5 concise insights as strings, nothing else. Each insight should be 20-30 words maximum and provide an actionable observation or recommendation.`;

    // Make the API call to Claude
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: JSON.stringify(promptData, null, 2)
        }
      ],
    });

    // Extract the content from the response
    // The newest version of the Anthropic SDK returns content differently
    const content = response.content[0]?.type === 'text' ? 
      (response.content[0] as { type: 'text', text: string }).text :
      JSON.stringify(["Could not extract content from AI response"]);
    
    try {
      // Parse the JSON response - expecting an array of strings
      const insights = JSON.parse(content);
      
      if (Array.isArray(insights)) {
        return insights.slice(0, 5); // Limit to max 5 insights
      }
      
      return ["Error processing AI system analysis results"];
    } catch (parseError) {
      console.error("Error parsing AI system response:", parseError);
      return ["Error processing AI system analysis results"];
    }
  } catch (error) {
    console.error("Error during AI system analysis:", error);
    return ["AI system analysis failed - service temporarily unavailable"];
  }
}
