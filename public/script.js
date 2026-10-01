
const GOOGLE_CLIENT_ID = "COLE_SEU_CLIENT_ID_AQUI";

const formulario = document.getElementById("formulario");
const campoNumero = document.getElementById("numero");
const area = document.getElementById("desenho");
const mensagem = document.getElementById("mensagem");
const botaoBaixar = document.getElementById("baixar");
const botaoDesenhar = document.getElementById("desenhar");
const estadoLogin = document.getElementById("estado-login");

let idToken = "";
let svgAtual = "";

function mostrarMensagem(texto) {
  mensagem.textContent = texto;
}

function receberCredencial(resposta) {
  idToken = resposta.credential;

  estadoLogin.textContent = "Login com Google realizado.";
  botaoDesenhar.disabled = false;
  mostrarMensagem("");
}

function iniciarLoginGoogle() {
  if (!window.google?.accounts?.id) {
    estadoLogin.textContent =
      "Não foi possível carregar o login Google. Atualize a página.";
    return;
  }

  if (
    !GOOGLE_CLIENT_ID ||
    GOOGLE_CLIENT_ID === "COLE_SEU_CLIENT_ID_AQUI"
  ) {
    estadoLogin.textContent =
      "Configure o Client ID do Google no arquivo script.js.";
    return;
  }

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: receberCredencial
  });

  window.google.accounts.id.renderButton(
    document.getElementById("botao-google"),
    {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      locale: "pt-BR"
    }
  );
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mostrarMensagem("");

  if (!idToken) {
    mostrarMensagem("Entre com sua conta Google antes de desenhar.");
    return;
  }

  const numero = Number(campoNumero.value);

  if (
    !Number.isInteger(numero) ||
    numero < 1 ||
    numero > 100
  ) {
    mostrarMensagem("Digite um inteiro entre 1 e 100.");
    return;
  }

  botaoDesenhar.disabled = true;

  try {
    const resposta = await fetch("/api/desenho", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({ numero })
    });

    if (!resposta.ok) {
      if (resposta.status === 400) {
        throw new Error("Número inválido. Digite um inteiro entre 1 e 100.");
      }

      if (resposta.status === 401) {
        idToken = "";
        estadoLogin.textContent =
          "Autenticação inválida ou expirada. Entre novamente com o Google.";
        botaoDesenhar.disabled = true;
        throw new Error("Falha na autenticação. Faça login novamente.");
      }

      throw new Error(`Erro no servidor: HTTP ${resposta.status}.`);
    }

    svgAtual = await resposta.text();

    area.replaceChildren();

    const imagem = document.createElement("img");
    imagem.alt = `Desenho assinado, número ${numero}`;
    imagem.style.width = "100%";
    imagem.style.maxWidth = "800px";
    imagem.src = URL.createObjectURL(
      new Blob([svgAtual], { type: "image/svg+xml" })
    );

    area.appendChild(imagem);
    botaoBaixar.hidden = false;
  } catch (erro) {
    mostrarMensagem(erro.message || "Não foi possível gerar o desenho.");
  } finally {
    botaoDesenhar.disabled = !idToken;
  }
});

botaoBaixar.addEventListener("click", () => {
  if (!svgAtual) return;

  const arquivo = new Blob([svgAtual], {
    type: "image/svg+xml"
  });

  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");

  link.href = url;
  link.download = "exemplo.svg";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
});

iniciarLoginGoogle();