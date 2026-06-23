const profile = (primary, secondary, tertiary) => ({ [primary]: 1, [secondary]: 0.78, [tertiary]: 0.56 });

export const stageDemands = {
  '1-1': profile('mechanic', 'mobility', 'support'), '1-2': profile('break', 'mechanic', 'range'),
  '1-3': profile('mobility', 'damage', 'control'), '1-4': profile('mechanic', 'support', 'range'),
  '1-5': profile('mobility', 'damage', 'break'), '1-6': profile('support', 'control', 'mechanic'),
  '1-7': profile('mobility', 'survival', 'control'), '1-8': profile('break', 'control', 'damage'),
  '1-9': profile('mobility', 'damage', 'range'), '1-10': profile('control', 'break', 'survival'),
  '2-1': profile('survival', 'mechanic', 'mobility'), '2-2': profile('range', 'mechanic', 'damage'),
  '2-3': profile('survival', 'support', 'control'), '2-4': profile('mechanic', 'control', 'break'),
  '2-5': profile('mobility', 'mechanic', 'damage'), '2-6': profile('control', 'break', 'survival'),
  '2-7': profile('mobility', 'control', 'survival'), '2-8': profile('mobility', 'range', 'survival'),
  '2-9': profile('mechanic', 'support', 'damage'), '2-10': profile('damage', 'survival', 'break'),
  '3-1': profile('mechanic', 'range', 'control'), '3-2': profile('control', 'mechanic', 'break'),
  '3-3': profile('control', 'survival', 'break'), '3-4': profile('mechanic', 'range', 'support'),
  '3-5': profile('mobility', 'survival', 'mechanic'), '3-6': profile('range', 'damage', 'mechanic'),
  '3-7': profile('mechanic', 'control', 'damage'), '3-8': profile('survival', 'support', 'mobility'),
  '3-9': profile('mechanic', 'range', 'control'), '3-10': profile('mobility', 'survival', 'break'),
  '4-1': profile('mobility', 'survival', 'break'), '4-2': profile('mechanic', 'mobility', 'control'),
  '4-3': profile('mechanic', 'support', 'damage'), '4-4': profile('mechanic', 'support', 'control'),
  '4-5': profile('range', 'damage', 'mobility'), '4-6': profile('control', 'break', 'damage'),
  '4-7': profile('mechanic', 'mobility', 'survival'), '4-8': profile('mobility', 'damage', 'mechanic'),
  '4-9': profile('survival', 'support', 'mechanic'), '4-10': profile('mobility', 'range', 'survival'),
  '5-1': profile('mobility', 'mechanic', 'damage'), '5-2': profile('control', 'survival', 'support'),
  '5-3': profile('range', 'damage', 'mechanic'), '5-4': profile('mechanic', 'control', 'support'),
  '5-5': profile('break', 'survival', 'mechanic'), '5-6': profile('survival', 'support', 'mobility'),
  '5-7': profile('mechanic', 'damage', 'control'), '5-8': profile('mechanic', 'range', 'control'),
  '5-9': profile('mobility', 'damage', 'mechanic'), '5-10': profile('mechanic', 'control', 'survival')
};
