/* ===== UPLOAD DE FOTOS VIA SUPABASE ===== */
let arquivosPendentes = []; // agora guarda File/Blob, não base64

(function () {
  const modalUpload = $('#modalUpload');
  const dropZone = $('#dropZone');
  const inputFotos = $('#inputFotos');

  $('#btnAddFoto').addEventListener('click', () => {
    arquivosPendentes = [];
    $('#previewGrid').innerHTML = '';
    $('#inputTitulo').value = '';
    modalUpload.classList.add('aberto');
  });

  dropZone.addEventListener('click', () => inputFotos.click());
  dropZone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputFotos.click(); }
  });
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('over');
    processarArquivos(e.dataTransfer.files);
  });
  inputFotos.addEventListener('change', () => processarArquivos(inputFotos.files));

  function processarArquivos(files) {
    [...files].forEach(file => {
      if (!file.type.startsWith('image/')) return;
      comprimirParaBlob(file, blob => {
        arquivosPendentes.push(blob);
        const url = URL.createObjectURL(blob);
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Pré-visualização';
        $('#previewGrid').appendChild(img);
      });
    });
    inputFotos.value = '';
  }

  function comprimirParaBlob(file, cb) {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1400;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          const r = Math.min(MAX / w, MAX / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => cb(blob), 'image/jpeg', 0.82);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  $('#btnSalvarFotos').addEventListener('click', async () => {
    if (!arquivosPendentes.length) {
      mostrarToast('Escolha pelo menos uma foto 🌷');
      return;
    }

    const cat = $('#selCategoria').value;
    const titulo = $('#inputTitulo').value.trim();
    const btnSalvar = $('#btnSalvarFotos');

    btnSalvar.textContent = 'Enviando...';
    btnSalvar.disabled = true;

    let sucesso = 0;
    for (const blob of arquivosPendentes) {
      const resultado = await uploadFoto(blob, cat, titulo);
      if (resultado) sucesso++;
    }

    btnSalvar.textContent = 'Salvar fotos';
    btnSalvar.disabled = false;

    if (sucesso > 0) {
      fecharModais();
      mostrarToast(`${sucesso} foto${sucesso > 1 ? 's' : ''} adicionada${sucesso > 1 ? 's' : ''} ao portfólio! 🌸`);
      arquivosPendentes = [];
      await renderGaleria();
      await renderDestaques();
    }
  });
})();
