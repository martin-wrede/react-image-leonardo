export async function onRequest(context) {
  const { request, env } = context;

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
    const body = await request.json();
    const { prompt, action, taskId } = body;

    console.log('📥 Received body:', body);

    // === IMAGE GENERATION (START) ===
    if (action === 'generate') {
      if (!prompt) throw new Error('Prompt is required');

      const startRes = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.LEONARDO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          modelId: 'ac614f96-1082-45bf-be9d-757f2d31c174', // Leonardo Vision XL
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
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // === IMAGE STATUS CHECK ===
    if (action === 'status') {
      if (!taskId) throw new Error('Missing taskId');
      console.log('🔍 Checking image status for task:', taskId);

      const statusResponse = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${env.LEONARDO_API_KEY}`,
        },
      });
      
      let statusData;
      try {
        statusData = await statusResponse.json();
        console.log('📦 statusData:', JSON.stringify(statusData));
      } catch (jsonError) {
        const raw = await statusResponse.text();
        console.error('❌ Failed to parse JSON:', raw);
        throw new Error(`Non-JSON response from Leonardo: ${raw}`);
      }

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
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // === Fallback for unknown actions ===
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid action',
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('🔥 ERROR:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}