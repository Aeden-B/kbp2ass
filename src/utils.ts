export function msToAss(ms: number): string {
	const date = new Date(ms);
	const hour = date.getUTCHours();
	const hourStr = `${hour}`.padStart(1, "0");
	const min = date.getUTCMinutes();
	const minStr = `${min}`.padStart(2, "0");
	const sec = date.getUTCSeconds();
	const secStr = `${sec}`.padStart(2, "0");
	const mil = date.getUTCMilliseconds();
	const milStr = `${mil}`.padStart(3, "0");
	return `${hourStr}:${minStr}:${secStr}.${milStr.substr(0, 2)}`;
  }
  
  export function clone<T>(a: T): T {
	return JSON.parse(JSON.stringify(a));
  }
  export function pickValues<K extends string | number | symbol, V>(
	obj: Record<K, V>,
	keys: K | K[]
  ): V[] {
	return Array.isArray(keys) ? keys.map(key => obj[key]) : [obj[keys]];
  }