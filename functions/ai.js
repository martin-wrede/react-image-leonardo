export async function onRequest(context) {
  const { request, env } = context;

  // STEP 1: Log immediately to confirm the worker is being hit.
  console.log(`\n--- New Request Received: ${new Date().toISOString()} ---`);
  console.log(`Method: ${request.method}, URL: ${request.url}`);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // STEP 2: Log the request body as text BEFORE parsing it.
    // This is the most important debugging step.
    const rawBody = await request.text();
    console.log('📬 Raw request body received:', rawBody);

    if (!rawBody) {
        throw new Error("Request body is empty. Frontend might be sending an empty request.");
    }
    
    // STEP 3: Now, safely parse the JSON.
    const body = JSON.parse(rawBody);
    const { prompt, action, taskId } = body;

    console.log('📥 Parsed body:', body);

    // === IMAGE GENERATION (START) ===
    if (action === 'generate') {
      if (!prompt) throw new Error('Prompt is required');
      console.log('🚀 Starting "generate" action...');

      const startRes = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.LEONARDO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          modelId: 'ac614f96-1082-45bf-be9d-757f2d31c174',
          height: 1024,
          width: 1024,
          num_images: 1,
          num_inference_steps: 25,
          guidance_scale: 7,
          presetStyle: 'LEONARDO'
        }),
      });

      const startData = await startRes.json();
      console.log('🧩 Leonardo API Response:', startData);

      if (!startRes.ok) {
        throw new Error(`Failed to start image generation: ${JSON.stringify(startData)}`);
      }

      const generationId = startData.sdGenerationJob?.generationId;
      if (!generationId) {
        throw new Error('Missing generationId from Leonardo response.');
      }

      return new Response(JSON.stringify({
        success: true,
        taskId: generationId,
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // === IMAGE STATUS CHECK ===
    if (action === 'status') {
      if (!taskId) throw new Error('Missing taskId');
      console.log('🔍 Checking image status for task:', taskId);

      // ... [rest of the status logic is the same] ...
      const statusResponse = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${taskId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${env.LEONARDO_API_KEY}` },
      });
      
      const statusData = await statusResponse.json();
      console.log('📦 Status data:', JSON.stringify(statusData));

      if (!statusResponse.ok) {
        throw new Error(`Status API error: ${JSON.stringify(statusData)}`);
      }
      
      const job = statusData.generations_by_pk;
      if (!job) {
          throw new Error(`Generation job with ID ${taskId} not found.`);
      }

      return new Response(JSON.stringify({
        success: true,
        status: job.status,
        imageUrl: job.generated_images?.[0]?.url || null,
        failure: job.status === 'FAILED' ? 'Generation failed on Leonardo' : null,
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // Fallback for unknown actions
    throw new Error('Invalid action specified in request body.');

  } catch (error) {
    // This catch block will now reliably log any error.
    console.error('🔥 FATAL ERROR in worker:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown server error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}