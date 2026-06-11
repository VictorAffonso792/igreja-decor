/* ===== PORTFÓLIO: GALERIA, FILTROS, LIGHTBOX, HERO ===== */
const NOMES_CAT = {
  casamentos: 'Casamentos',
  festas: 'Festas',
  buques: 'Buquês',
  decoracao: 'Decoração',
  arranjos: 'Arranjos'
};

const SEED_PLACEHOLDERS = [
  { cat: 'casamentos', titulo: 'Casamento na igreja', cor: '#EFE6D8' },
  { cat: 'casamentos', titulo: 'Arco floral do altar', cor: '#F1E8E0' },
  { cat: 'festas', titulo: 'Festa de 15 anos', cor: '#F3E4DD' },
  { cat: 'buques', titulo: 'Buquê da noiva', cor: '#E9EDE2' },
  { cat: 'decoracao', titulo: 'Mesa posta', cor: '#E6EBE4' },
  { cat: 'arranjos', titulo: 'Arranjo de mesa', cor: '#EDE7DA' }
];

let filtroAtivo = 'todos';

function placeholderHTML(cor, texto) {
  return `
  <div class="placeholder-flor" style="background:${cor}">
    <svg viewBox="0 0 24 24"><use href="#ico-flor"/></svg>
    <span>${texto || 'Fotos em breve 🌷'}</span>
  </div>`;
}

async function renderGaleria() {
  const galeria = $('#galeria');
  galeria.innerHTML = '<div style="text-align:center;padding:40px;color:var(--tinta-suave)">Carregando fotos...</div>';

  let fotos = [];
  try {
    fotos = await carregarFotos();
  } catch (e) {
    console.error('Erro renderGaleria:', e);
  }

  galeria.innerHTML = '';

  if (fotos.length) {
    const filtradas = fotos.filter(f => f.cat !== 'sobre' && (filtroAtivo === 'todos' || f.cat === filtroAtivo));
    if (!filtradas.length) {
      galeria.innerHTML = '<div class="galeria-vazia">Ainda não há fotos nessa categoria 🌱<br><small>Use a Área da Igreja Decor para adicionar.</small></div>';
      return;
    }
    filtradas.forEach(f => {
      const card = document.createElement('div');
      card.className = 'foto-card';
      card.innerHTML = `
        <img src="${f.src}" alt="${f.titulo || NOMES_CAT[f.cat] || 'Trabalho Igreja Decor'}" loading="lazy">
        <div class="foto-info"><strong>${f.titulo || 'Trabalho Igreja Decor'}</strong><span>${NOMES_CAT[f.cat] || f.cat}</span></div>
        <button class="foto-del" aria-label="Excluir foto">🗑</button>`;
      card.querySelector('img').addEventListener('click', () => abrirLightbox(f));
      card.querySelector('.foto-del').addEventListener('click', async (ev) => {
        ev.stopPropagation();
        if (confirm('Excluir esta foto do portfólio?')) {
          const ok = await excluirFoto(f.id, f.src);
          if (ok) {
            mostrarToast('Foto removida 🍂');
            await renderGaleria();
            await renderDestaques();
          }
        }
      });
      galeria.appendChild(card);
    });
  } else {
    SEED_PLACEHOLDERS
      .filter(s => filtroAtivo === 'todos' || s.cat === filtroAtivo)
      .forEach(s => {
        const card = document.createElement('div');
        card.className = 'foto-card';
        card.innerHTML = placeholderHTML(s.cor) +
          `<div class="foto-info"><strong>${s.titulo}</strong><span>${NOMES_CAT[s.cat]}</span></div>`;
        galeria.appendChild(card);
      });
  }
}

async function renderDestaques() {
  let fotos = [];
  try { fotos = await carregarFotos(); } catch(e) {}
  
  /* Fotos do portfólio (excluindo "sobre") para os arcos do hero */
  const fotosPortfolio = fotos.filter(f => f.cat !== 'sobre');
  const cores = ['#EFE6D8', '#E9EDE2', '#F3E4DD'];
  $$('[data-hero]').forEach((el, i) => {
    el.innerHTML = fotosPortfolio[i]
      ? `<img src="${fotosPortfolio[i].src}" alt="${fotosPortfolio[i].titulo || 'Trabalho Igreja Decor'}">`
      : placeholderHTML(cores[i]);
  });
  
  /* Foto da seção Sobre */
  const fotoSobre = fotos.find(f => f.cat === 'sobre');
  const sobre = $('#sobrePhoto');
  if (sobre) {
    if (fotoSobre) {
      sobre.innerHTML = '<img src="' + fotoSobre.src + '" alt="Igreja Decor">';
    } else {
      sobre.innerHTML = placeholderHTML('#EDE7DA', 'Sua foto aqui 💚');
    }
    /* No modo admin, clicar no sobre abre o upload */
    sobre.style.cursor = document.body.classList.contains('admin') ? 'pointer' : '';
    sobre.onclick = function() {
      if (document.body.classList.contains('admin')) {
        document.getElementById('selCategoria').value = 'sobre';
        document.getElementById('btnAddFoto').click();
      }
    };
  }
}

/* Filtros */
$$('.filtro').forEach(btn => btn.addEventListener('click', () => {
  $$('.filtro').forEach(b => b.classList.remove('ativo'));
  btn.classList.add('ativo');
  filtroAtivo = btn.dataset.cat;
  renderGaleria();
}));

/* Lightbox */
function abrirLightbox(f) {
  $('#lightboxImg').src = f.src;
  $('#lightboxImg').alt = f.titulo || NOMES_CAT[f.cat] || '';
  $('#lightboxLegenda').textContent = f.titulo || NOMES_CAT[f.cat] || '';
  $('#lightbox').classList.add('aberto');
}
$('#lightboxFechar').addEventListener('click', () => $('#lightbox').classList.remove('aberto'));
$('#lightbox').addEventListener('click', e => {
  if (e.target === $('#lightbox')) $('#lightbox').classList.remove('aberto');
});
