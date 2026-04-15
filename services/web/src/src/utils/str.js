export function truncateWords(str, maxLength = 15) {
  if (str.length <= maxLength) return str;

  let trimmed = str.slice(0, maxLength);
  return trimmed.slice(0, trimmed.lastIndexOf(" ")) + "...";
}