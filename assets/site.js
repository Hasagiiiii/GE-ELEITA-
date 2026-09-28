const botaoCopiarPix = document.getElementById('copiar-pix');
    const chavePix = 'geleita526@gmail.com';

    botaoCopiarPix?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(chavePix);
        botaoCopiarPix.textContent = 'Pix copiado ✓';
      } catch (erro) {
        const campoTemporario = document.createElement('textarea');
        campoTemporario.value = chavePix;
        document.body.appendChild(campoTemporario);
        campoTemporario.select();
        document.execCommand('copy');
        campoTemporario.remove();
        botaoCopiarPix.textContent = 'Pix copiado ✓';
      }
      setTimeout(() => botaoCopiarPix.textContent = 'Copiar Pix', 2200);
    });

    const formulario = document.getElementById('formulario-retiro');
    // Validate each step in JavaScript so hidden invalid fields can be revealed.
    formulario.noValidate = true;
    const passos = [...document.querySelectorAll('.passo')];
    const indicadores = [...document.querySelectorAll('.etapa-indicador')];
    const botaoVoltar = document.getElementById('voltar');
    const botaoAvancar = document.getElementById('avancar');
    const botaoEnviar = document.getElementById('enviar');
    const mensagemStatus = document.getElementById('mensagem-status');
    let passoAtual = 0;

    function mostrarPasso(indice) {
      passoAtual = indice;
      passos.forEach((passo, i) => passo.classList.toggle('ativo', i === indice));
      indicadores.forEach((item, i) => {
        item.classList.toggle('ativa', i === indice);
        item.classList.toggle('concluida', i < indice);
      });
      botaoVoltar.hidden = indice === 0;
      botaoAvancar.hidden = indice === passos.length - 1;
      botaoEnviar.hidden = indice !== passos.length - 1;
      mensagemStatus.className = 'mensagem-status';
      mensagemStatus.textContent = '';
      document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function validarPassoAtual() {
      const campos = [...passos[passoAtual].querySelectorAll('input, select, textarea')]
        .filter(campo => !campo.disabled && campo.offsetParent !== null);

      for (const campo of campos) {
        if (!campo.checkValidity()) {
          campo.reportValidity();
          campo.focus();
          return false;
        }
      }
      return true;
    }

    botaoAvancar.addEventListener('click', () => {
      if (validarPassoAtual()) mostrarPasso(Math.min(passoAtual + 1, passos.length - 1));
    });

    botaoVoltar.addEventListener('click', () => mostrarPasso(Math.max(passoAtual - 1, 0)));

    const idade = document.getElementById('idade');
    const avisoMenor = document.getElementById('aviso-menor');
    const responsavel = document.getElementById('responsavel');
    const parentesco = document.getElementById('parentesco');
    const telefoneResponsavel = document.getElementById('telefone-responsavel');
    const autorizacaoMenorBloco = document.getElementById('autorizacao-menor-bloco');
    const autorizacaoMenor = document.getElementById('autorizacao-menor');
    const rotulosResponsavel = [
      document.getElementById('label-responsavel'),
      document.getElementById('label-parentesco'),
      document.getElementById('label-telefone-responsavel')
    ];

    function atualizarResponsavel() {
      const menor = Number(idade.value) > 0 && Number(idade.value) < 18;
      avisoMenor.classList.toggle('visivel', menor);
      autorizacaoMenorBloco.classList.toggle('visivel', menor);
      autorizacaoMenor.required = menor;
      if (!menor) autorizacaoMenor.checked = false;
      [responsavel, parentesco, telefoneResponsavel].forEach(campo => campo.required = menor);
      rotulosResponsavel.forEach(rotulo => rotulo.classList.toggle('obrigatorio', menor));
    }

    idade.addEventListener('input', atualizarResponsavel);

    function controlarCondicional(nome, valorSim, blocoId, campoId) {
      const radios = [...document.querySelectorAll(`input[name="${nome}"]`)];
      const bloco = document.getElementById(blocoId);
      const campo = document.getElementById(campoId);

      radios.forEach(radio => radio.addEventListener('change', () => {
        const ativo = radio.checked && radio.value === valorSim;
        if (radio.checked) {
          bloco.classList.toggle('visivel', ativo);
          campo.required = ativo;
          if (!ativo) campo.value = '';
        }
      }));
    }

    controlarCondicional('possui_alergia', 'Sim', 'detalhes-alergia', 'alergias');
    controlarCondicional('usa_medicamento', 'Sim', 'detalhes-medicamento', 'medicamentos');

    const formasPagamento = [...document.querySelectorAll('input[name="forma_pagamento"]')];
    const dadosPix = document.getElementById('dados-pix');
    const avisoPagamentoPresencial = document.getElementById('aviso-pagamento-presencial');

    function atualizarPagamento() {
      const selecionado = document.querySelector('input[name="forma_pagamento"]:checked')?.value || '';
      const pagamentoPix = selecionado === 'Pix';
      const pagamentoPresencial = selecionado === 'Cartão presencial' || selecionado === 'Dinheiro presencial';

      dadosPix.classList.toggle('visivel', pagamentoPix);
      avisoPagamentoPresencial.classList.toggle('visivel', pagamentoPresencial);
    }

    formasPagamento.forEach(opcao => opcao.addEventListener('change', atualizarPagamento));

    function aplicarMascaraTelefone(campo) {
      campo.addEventListener('input', () => {
        let valor = campo.value.replace(/\D/g, '').slice(0, 11);
        if (valor.length > 10) {
          valor = valor.replace(/^(\d{2})(\d{5})(\d{0,4})$/, '($1) $2-$3');
        } else if (valor.length > 6) {
          valor = valor.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
        } else if (valor.length > 2) {
          valor = valor.replace(/^(\d{2})(\d+)/, '($1) $2');
        } else if (valor.length) {
          valor = valor.replace(/^(\d{0,2})/, '($1');
        }
        campo.value = valor;
      });
    }

    ['telefone', 'telefone-responsavel', 'emergencia'].forEach(id => aplicarMascaraTelefone(document.getElementById(id)));

    const SUPABASE_URL = window.GE_CONFIG.supabaseUrl;
    const SUPABASE_PUBLISHABLE_KEY = window.GE_CONFIG.supabasePublishableKey;

    formulario.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      if (botaoEnviar.disabled) return;
      atualizarResponsavel();
      atualizarPagamento();

      const invalidStep = passos.findIndex(passo => [...passo.querySelectorAll('input, select, textarea')].some(campo => !campo.checkValidity()));
      if (invalidStep !== -1) {
        mostrarPasso(invalidStep);
        validarPassoAtual();
        mensagemStatus.className = 'mensagem-status erro';
        mensagemStatus.textContent = 'Confira os campos obrigatórios antes de enviar.';
        return;
      }

      const textoOriginalBotao = botaoEnviar.textContent;
      botaoEnviar.disabled = true;
      botaoEnviar.textContent = 'Enviando...';
      mensagemStatus.className = 'mensagem-status';
      mensagemStatus.textContent = '';

      const dadosFormulario = Object.fromEntries(new FormData(formulario).entries());
      const nuloSeVazio = (valor) => valor && String(valor).trim() ? String(valor).trim() : null;

      const inscricao = {
        evento: dadosFormulario.evento,
        nome_completo: dadosFormulario.nome_completo,
        idade: Number(dadosFormulario.idade),
        telefone_participante: dadosFormulario.telefone_participante,
        tamanho_camisa: dadosFormulario.tamanho_camisa,
        igreja: dadosFormulario.igreja,
        possui_alergia: dadosFormulario.possui_alergia,
        alergias_restricoes: nuloSeVazio(dadosFormulario.alergias_restricoes),
        usa_medicamento: dadosFormulario.usa_medicamento,
        medicamentos_orientacoes: nuloSeVazio(dadosFormulario.medicamentos_orientacoes),
        condicoes_saude: nuloSeVazio(dadosFormulario.condicoes_saude),
        nome_responsavel: nuloSeVazio(dadosFormulario.nome_responsavel),
        parentesco: nuloSeVazio(dadosFormulario.parentesco),
        telefone_responsavel: nuloSeVazio(dadosFormulario.telefone_responsavel),
        contato_emergencia: dadosFormulario.contato_emergencia,
        forma_pagamento: dadosFormulario.forma_pagamento,
        autorizacao_menor: nuloSeVazio(dadosFormulario.autorizacao_menor),
        consentimento: dadosFormulario.consentimento,
        chave_pix: dadosFormulario.chave_pix,
        valor_inscricao: dadosFormulario.valor_inscricao,
        envio_comprovante: dadosFormulario.envio_comprovante,
        origem: 'site-github-pages'
      };

      try {
        const resposta = await fetch(`${SUPABASE_URL}/rest/v1/inscricoes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(inscricao)
        });

        if (!resposta.ok) {
          const detalhes = await resposta.text();
          console.error('Supabase:', resposta.status, detalhes);
          throw new Error(`Falha ao registrar inscrição: ${resposta.status}`);
        }

        formulario.reset();
        document.getElementById('detalhes-alergia').classList.remove('visivel');
        document.getElementById('detalhes-medicamento').classList.remove('visivel');
        document.getElementById('alergias').required = false;
        document.getElementById('medicamentos').required = false;
        atualizarResponsavel();
        atualizarPagamento();
        mostrarPasso(0);
        mensagemStatus.className = 'mensagem-status sucesso';
        mensagemStatus.textContent = 'Inscrição enviada com sucesso! A liderança entrará em contato para a confirmação.';
      } catch (erro) {
        console.error(erro);
        mensagemStatus.className = 'mensagem-status erro';
        mensagemStatus.textContent = 'Não foi possível enviar sua inscrição agora. Tente novamente em alguns instantes.';
      } finally {
        botaoEnviar.disabled = false;
        botaoEnviar.textContent = textoOriginalBotao;
      }
    });
