/**
 * Converte erros do SQLite em mensagens compreensíveis para o usuário.
 */
export function traduzirErro(erro: unknown): string {
  const mensagem = erro instanceof Error ? erro.message : String(erro ?? '');

  if (/UNIQUE constraint failed: CLIENTE\.cpf/i.test(mensagem)) {
    return 'Já existe um cliente cadastrado com este CPF.';
  }
  if (/UNIQUE constraint failed: VEICULO\.placa/i.test(mensagem)) {
    return 'Já existe um veículo cadastrado com esta placa.';
  }
  if (/UNIQUE constraint failed: ESTADIA\.id_veiculo/i.test(mensagem)) {
    return 'Este veículo já está no pátio. Registre a saída antes de uma nova entrada.';
  }
  if (/FOREIGN KEY constraint failed/i.test(mensagem)) {
    return 'Não é possível excluir: existem registros vinculados (veículos ou estadias).';
  }
  if (/CHECK constraint failed/i.test(mensagem)) {
    return 'Dados inválidos. Verifique os valores e as datas informadas.';
  }
  if (mensagem && !/sqlite|sql/i.test(mensagem)) {
    // Erros de validação lançados pelo próprio aplicativo.
    return mensagem;
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}
