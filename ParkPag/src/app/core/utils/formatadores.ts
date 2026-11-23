/* Formatação, máscaras e validações usadas nas telas. */

const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function somenteDigitos(valor: string | null | undefined): string {
  return (valor ?? '').replace(/\D/g, '');
}

// ---------- Moeda e duração ----------

export function formatarMoeda(valor: number | null | undefined): string {
  return formatoMoeda.format(valor ?? 0);
}

/** 180 → "3h00"; 125 → "2h05". */
export function formatarDuracao(minutos: number | null | undefined): string {
  const total = Math.max(0, minutos ?? 0);
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return `${horas}h${resto.toString().padStart(2, '0')}`;
}

// ---------- Datas (ISO 8601 local: YYYY-MM-DDTHH:mm:ss) ----------

function doisDigitos(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Converte um Date para ISO 8601 no horário local, sem fuso. */
export function paraIsoLocal(data: Date): string {
  return (
    `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}` +
    `T${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}:${doisDigitos(data.getSeconds())}`
  );
}

export function agoraIsoLocal(): string {
  return paraIsoLocal(new Date());
}

/** "2026-10-27" + "08:30" → "2026-10-27T08:30:00". */
export function combinarDataHora(data: string, hora: string): string {
  return `${data}T${hora.slice(0, 5)}:00`;
}

/** Parte da data (YYYY-MM-DD) de um ISO local. */
export function extrairData(iso: string): string {
  return iso.slice(0, 10);
}

/** Parte do horário (HH:mm) de um ISO local. */
export function extrairHora(iso: string): string {
  return iso.slice(11, 16);
}

/** "2026-10-27T08:30:00" → "27/10/2026". */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

/** "2026-10-27T08:30:00" → "27/10". */
export function formatarDataCurta(iso: string | null | undefined): string {
  return formatarData(iso).slice(0, 5);
}

/** "2026-10-27T08:30:00" → "08:30". */
export function formatarHora(iso: string | null | undefined): string {
  return iso ? extrairHora(iso) : '';
}

/** "27/10/2026" → "2026-10-27" (retorna null se inválida). */
export function dataBrParaIso(dataBr: string): string | null {
  const digitos = somenteDigitos(dataBr);
  if (digitos.length !== 8) return null;
  const dia = Number(digitos.slice(0, 2));
  const mes = Number(digitos.slice(2, 4));
  const ano = Number(digitos.slice(4, 8));
  const data = new Date(ano, mes - 1, dia);
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
    return null;
  }
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

// ---------- Máscaras ----------

/** Aplica um padrão em que "0" representa um dígito. */
function aplicarMascara(digitos: string, padrao: string): string {
  let resultado = '';
  let i = 0;
  for (const caractere of padrao) {
    if (i >= digitos.length) break;
    if (caractere === '0') {
      resultado += digitos[i++];
    } else {
      resultado += caractere;
    }
  }
  return resultado;
}

export function formatarCpf(valor: string | null | undefined): string {
  return aplicarMascara(somenteDigitos(valor).slice(0, 11), '000.000.000-00');
}

export function formatarTelefone(valor: string | null | undefined): string {
  const digitos = somenteDigitos(valor).slice(0, 11);
  const padrao = digitos.length > 10 ? '(00) 00000-0000' : '(00) 0000-0000';
  return aplicarMascara(digitos, padrao);
}

export function formatarCep(valor: string | null | undefined): string {
  return aplicarMascara(somenteDigitos(valor).slice(0, 8), '00000-000');
}

export function formatarDataDigitada(valor: string | null | undefined): string {
  return aplicarMascara(somenteDigitos(valor).slice(0, 8), '00/00/0000');
}

// ---------- Placa ----------

/** Remove hífen/espaços e coloca em maiúsculas: "abc-1d23" → "ABC1D23". */
export function normalizarPlaca(valor: string | null | undefined): string {
  return (valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

/** "ABC1D23" → "ABC-1D23". */
export function formatarPlaca(valor: string | null | undefined): string {
  const placa = normalizarPlaca(valor);
  return placa.length > 3 ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa;
}

/** Aceita o padrão antigo (ABC1234) e o Mercosul (ABC1D23). */
export function validarPlaca(valor: string | null | undefined): boolean {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizarPlaca(valor));
}

// ---------- Validações ----------

export function validarCpf(valor: string | null | undefined): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digitoVerificador = (base: string): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (base.length + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const d1 = digitoVerificador(cpf.slice(0, 9));
  const d2 = digitoVerificador(cpf.slice(0, 10));
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

export function validarEmail(valor: string | null | undefined): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((valor ?? '').trim());
}

export function validarTelefone(valor: string | null | undefined): boolean {
  const digitos = somenteDigitos(valor);
  return digitos.length === 10 || digitos.length === 11;
}

/** Inicial do nome para avatares: "Ayla Abreu" → "A". */
export function inicial(nome: string): string {
  return nome.trim().charAt(0).toUpperCase();
}
