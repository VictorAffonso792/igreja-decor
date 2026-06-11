/* ===== SUPABASE — CAMADA DE PERSISTÊNCIA ===== */
var sbClient = (function() {
  try {
    return window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  } catch(e) {
    console.error('Erro ao conectar Supabase:', e);
    return null;
  }
})();

var BUCKET = CONFIG.supabaseBucket;
var _cacheGaleria = null;
var _cacheTs = 0;
var CACHE_TTL = 5000;

async function carregarFotos(forceRefresh) {
  if (!sbClient) return [];
  var now = Date.now();
  if (!forceRefresh && _cacheGaleria && (now - _cacheTs < CACHE_TTL)) {
    return _cacheGaleria;
  }
  try {
    var result = await sbClient
      .from('fotos')
      .select('*')
      .order('created_at', { ascending: false });
    if (result.error) throw result.error;
    _cacheGaleria = result.data || [];
    _cacheTs = now;
    return _cacheGaleria;
  } catch (e) {
    console.error('Erro ao carregar fotos:', e);
    return _cacheGaleria || [];
  }
}

async function uploadFoto(file, cat, titulo) {
  if (!sbClient) return null;
  try {
    var ext = file.type === 'image/png' ? 'png' : 'jpg';
    var nome = Date.now() + '_' + Math.random().toString(36).slice(2,8) + '.' + ext;

    var upResult = await sbClient.storage
      .from(BUCKET)
      .upload(nome, file, { contentType: file.type, upsert: false });
    if (upResult.error) throw upResult.error;

    var urlData = sbClient.storage
      .from(BUCKET)
      .getPublicUrl(nome);
    var src = urlData.data.publicUrl;

    var dbResult = await sbClient
      .from('fotos')
      .insert({ src: src, cat: cat, titulo: titulo || '' })
      .select()
      .single();
    if (dbResult.error) throw dbResult.error;

    _cacheGaleria = null;
    return dbResult.data;
  } catch (e) {
    console.error('Erro no upload:', e);
    mostrarToast('Erro ao enviar foto. Tente novamente.');
    return null;
  }
}

async function excluirFoto(id, src) {
  if (!sbClient) return false;
  try {
    var partes = src.split('/');
    var nomeArquivo = partes[partes.length - 1];
    await sbClient.storage.from(BUCKET).remove([nomeArquivo]);
    var result = await sbClient.from('fotos').delete().eq('id', id);
    if (result.error) throw result.error;
    _cacheGaleria = null;
    return true;
  } catch (e) {
    console.error('Erro ao excluir:', e);
    mostrarToast('Erro ao excluir foto.');
    return false;
  }
}
