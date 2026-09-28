import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    const folderUrl = 'https://drive.google.com/drive/folders/13ThrxuREivJjLwMOiRQMdRk6tvndeRpa?usp=sharing';
    const res = await fetch(folderUrl);
    const html = await res.text();

    const files = [];
    const regex = /\["([a-zA-Z0-9_-]{33})",\["([^"]+?\.(?:docx|epub))"/g;
    
    let match;
    const seen = new Set();
    while ((match = regex.exec(html)) !== null) {
      const id = match[1];
      const name = match[2];
      if (!seen.has(id)) {
        seen.add(id);
        files.push({
          id,
          name,
          url: \`https://drive.google.com/uc?export=download&id=\${id}&ext=.docx\`
        });
      }
    }

    return new Response(JSON.stringify({ files }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
