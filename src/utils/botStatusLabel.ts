export function botStatusLabel(message: { text?: string; botStatusKind?: string }): string {
  const content = message.text?.trim();
  if (content) return content;
  if (message.botStatusKind === 'ia_on') return 'IA encendida';
  if (message.botStatusKind === 'order_completed') return 'Pedido acabado';
  if (message.botStatusKind === 'human_intervention') return 'Intervención humana';
  return 'IA apagada';
}
