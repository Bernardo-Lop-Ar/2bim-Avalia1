
import { gerarDesenho, numeroValido } from "../../lib/desenho.js";

export async function onRequest({ request, env }) {
  // 1. O método deve ser POST.
  if (request.method !== "POST") {
    return new Response("Método não permitido.", {
      status: 405,
      headers: { "Allow": "POST" }
    });
  }

  // 2. Validar o corpo antes de verificar o token.
  let dados;

  try {
    const corpo = await request.text();

    if (!corpo.trim()) {
      return new Response("Corpo da requisição ausente.", {
        status: 400
      });
    }

    dados = JSON.parse(corpo);
  } catch {
    return new Response("JSON inválido.", {
      status: 400
    });
  }

  if (
    !dados ||
    typeof dados !== "object" ||
    Array.isArray(dados) ||
    !Object.prototype.hasOwnProperty.call(dados, "numero") ||
    !numeroValido(dados.numero)
  ) {
    return new Response(
      "O número deve ser um inteiro entre 1 e 100.",
      { status: 400 }
    );
  }

  // 3. Validar o token de autenticação do Google.
  const autorizacao = request.headers.get("Authorization") || "";
  const correspondencia = autorizacao.match(/^Bearer\s+(\S+)$/i);

  if (!correspondencia || !env.GOOGLE_CLIENT_ID) {
    return new Response("Token ausente ou inválido.", {
      status: 401
    });
  }

  const token = correspondencia[1];

  let verificacao;

  try {
    const url = new URL("https://oauth2.googleapis.com/tokeninfo");
    url.searchParams.set("id_token", token);

    const respostaGoogle = await fetch(url.toString());

    if (!respostaGoogle.ok) {
      return new Response("Token inválido ou expirado.", {
        status: 401
      });
    }

    verificacao = await respostaGoogle.json();
  } catch {
    return new Response("Não foi possível verificar o token.", {
      status: 401
    });
  }

  if (
    verificacao.aud !== env.GOOGLE_CLIENT_ID ||
    verificacao.email_verified !== "true" ||
    typeof verificacao.email !== "string" ||
    !verificacao.email.trim()
  ) {
    return new Response("Token inválido ou e-mail não verificado.", {
      status: 401
    });
  }

  // 4. Gerar o SVG no servidor com o e-mail verificado.
  try {
    const svg = gerarDesenho(dados.numero, verificacao.email);

    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return new Response("Erro ao gerar o desenho.", {
      status: 500
    });
  }
}