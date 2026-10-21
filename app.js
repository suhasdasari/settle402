const CHAINS={
 base:{name:"Base",chainId:8453,usdc:"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",explorer:"https://basescan.org",rpcs:["https://base-rpc.publicnode.com","https://mainnet.base.org","https://base.drpc.org"]},
 arbitrum:{name:"Arbitrum One",chainId:42161,usdc:"0xaf88d065e77c8cC2239327C5EDb3A432268e5831",explorer:"https://arbiscan.io",rpcs:["https://arbitrum-one-rpc.publicnode.com","https://arb1.arbitrum.io/rpc","https://arbitrum.drpc.org"]}};
const TOPIC="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const $=id=>document.getElementById(id);
async function rpc(ch,method,params){let last;for(const u of ch.rpcs){try{const r=await fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});const j=await r.json();if(j.error)throw new Error(j.error.message);return j.result}catch(e){last=e}}throw last}
const pad=a=>"0x"+"0".repeat(24)+a.toLowerCase().slice(2);
function toUnits(s){const[i,f=""]=String(s).split(".");return BigInt(i||"0")*1000000n+BigInt((f+"000000").slice(0,6))}
function fmt(u){u=BigInt(u);return (u/1000000n)+"."+(u%1000000n).toString().padStart(6,"0")}
function params(){const h=new URLSearchParams(location.hash.slice(1));return Object.fromEntries(h)}
function request(p){const ch=CHAINS[p.c];const units=toUnits(p.amt);return{
 x402Version:1,scheme:"exact-erc20-transfer",status:402,description:p.memo||"",
 accepts:[{network:p.c,chainId:ch.chainId,asset:"USDC",assetContract:ch.usdc,decimals:6,payTo:p.to,amount:p.amt,amountAtomic:units.toString(),
 method:"ERC20.transfer(address,uint256)",calldata:"0xa9059cbb"+pad(p.to).slice(2)+units.toString(16).padStart(64,"0"),
 validAfterBlock:p.from?Number(p.from):null}],
 verification:{rule:"A USDC Transfer log (topic0 "+TOPIC+") with to == payTo and value == amountAtomic, in a block >= validAfterBlock",publicRpcs:ch.rpcs},
 invoiceUrl:location.href}}
function isMatch(log,ch,to,units){return log.address.toLowerCase()===ch.usdc.toLowerCase()&&log.topics[0]===TOPIC&&log.topics[2]&&log.topics[2].toLowerCase()===pad(to)&&BigInt(log.data)===units}
function showPaid(ch,log){$("status").className="st paid";$("status").textContent="Paid ✓ — matching on-chain USDC transfer found";
 $("match").innerHTML=`Tx: <a target=_blank href="${ch.explorer}/tx/${log.transactionHash}">${log.transactionHash}</a><br>Block: ${parseInt(log.blockNumber,16)}<br>From: 0x${log.topics[1].slice(26)}`;document.title="PAID — Settle402"}
async function verifyTx(p,hash){const ch=CHAINS[p.c],units=toUnits(p.amt);$("status").className="st pending";$("status").textContent="Fetching receipt…";
 try{const r=await rpc(ch,"eth_getTransactionReceipt",[hash]);if(!r){$("status").textContent="Transaction not found (yet) on "+ch.name;return false}
 if(r.status!=="0x1"){$("status").className="st err";$("status").textContent="Transaction reverted";return false}
 const blk=parseInt(r.blockNumber,16);const l=r.logs.find(l=>isMatch(l,ch,p.to,units));
 if(l&&(!p.from||blk>=+p.from)){showPaid(ch,l);return true}
 $("status").className="st err";$("status").textContent="Transaction has no USDC transfer of "+p.amt+" to the recipient"+(p.from&&blk<+p.from?" after the start block":"");return false}
 catch(e){$("status").className="st err";$("status").textContent="RPC error: "+e.message;return false}}
async function scan(p){const ch=CHAINS[p.c],units=toUnits(p.amt);$("status").className="st pending";$("status").textContent="Scanning "+ch.name+" logs…";
 try{const head=parseInt(await rpc(ch,"eth_blockNumber",[]),16);const start=p.from?Number(p.from):head-5000;const STEP=5000,MAX=200000;
 let lo=Math.max(start,head-MAX);for(let a=lo;a<=head;a+=STEP){const b=Math.min(a+STEP-1,head);
  const logs=await rpc(ch,"eth_getLogs",[{fromBlock:"0x"+a.toString(16),toBlock:"0x"+b.toString(16),address:ch.usdc,topics:[TOPIC,null,pad(p.to)]}]);
  const m=logs.find(l=>isMatch(l,ch,p.to,units));if(m){showPaid(ch,m);return}
  $("status").textContent=`Scanning ${ch.name} blocks ${a}–${b} of ${head}…`}
 $("status").className="st pending";$("status").textContent=`Unpaid — no matching transfer in blocks ${lo}–${head}`+(start<lo?" (scan window capped at 200k blocks; use 'Verify by tx hash')":"")}
 catch(e){$("status").className="st err";$("status").textContent="RPC error: "+e.message}}
async function walletPay(p){const ch=CHAINS[p.c];if(!window.ethereum){alert("No injected wallet found");return}
 const [acct]=await ethereum.request({method:"eth_requestAccounts"});
 try{await ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:"0x"+ch.chainId.toString(16)}]})}catch(e){alert("Switch your wallet to "+ch.name);return}
 const hash=await ethereum.request({method:"eth_sendTransaction",params:[{from:acct,to:ch.usdc,data:request(p).accepts[0].calldata}]});
 $("txin").value=hash;const poll=async()=>{if(!(await verifyTx(p,hash)))setTimeout(poll,4000)};setTimeout(poll,4000)}
async function init(){const p=params();
 if(!p.to||!CHAINS[p.c]){$("create").hidden=false;$("f").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
  if(!d.from){try{d.from=parseInt(await rpc(CHAINS[d.c],"eth_blockNumber",[]),16)}catch{delete d.from}}
  Object.keys(d).forEach(k=>d[k]===""&&delete d[k]);const u=location.href.split("#")[0]+"#"+new URLSearchParams(d);$("link").value=u;$("open").href=u;$("out").hidden=false};return}
 $("pay").hidden=false;const ch=CHAINS[p.c];$("ptitle").textContent=(p.memo||"Invoice")+" — "+p.amt+" USDC";
 $("details").innerHTML=[["Network",ch.name],["Recipient",p.to],["Amount",p.amt+" USDC"],["USDC contract",ch.usdc],["Start block",p.from||"last ~5000 blocks"]].map(([k,v])=>`<dt>${k}</dt><dd></dd>`).join("");
 [...$("details").querySelectorAll("dd")].forEach((dd,i)=>dd.textContent=[ch.name,p.to,p.amt+" USDC",ch.usdc,p.from||"last ~5000 blocks"][i]);
 const req=request(p);$("json").textContent=JSON.stringify(req,null,2);
 $("dl").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(req,null,2)],{type:"application/json"}));a.download="payment-request.json";a.click()};
 $("recheck").onclick=()=>p.tx?verifyTx(p,p.tx):scan(p);$("txbtn").onclick=()=>verifyTx(p,$("txin").value.trim());$("walletpay").onclick=()=>walletPay(p).catch(e=>alert(e.message));
 p.tx?verifyTx(p,p.tx):scan(p)}
window.addEventListener("hashchange",()=>location.reload());init();
