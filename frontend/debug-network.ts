import { getNetwork } from "./src/lib/network";
const n = getNetwork();
console.log(Object.keys(n));
console.log(JSON.stringify(n, null, 2));
