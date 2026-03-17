import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  const { expiringItems } = await req.json();

  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  const prompt = `
You are a smart food assistant.

Given these expiring items:
${JSON.stringify(expiringItems)}

Generate 3 recipes in this JSON format ONLY:

{
  "recipes": [
    {
      "title": "",
      "prepTimeMinutes": number,
      "servings": number,
      "ingredients": ["", ""],
      "instructions": ["", ""]
    }
  ]
}
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful AI chef." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!response.ok) {
  const errText = await response.text();
  console.log("OPENAI ERROR:", errText);
  return new Response(errText, { status: 500 });
}

  const data = await response.json();

  const text = data.choices[0].message.content;

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to parse AI response" }),
      { status: 500 }
    );
  }
  console.log("OPENAI KEY:", openaiKey);
console.log("AI RESPONSE:", data);

  return new Response(JSON.stringify(parsed), {
    headers: { "Content-Type": "application/json" },
  });
});