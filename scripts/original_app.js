Created At: 2026-09-29T14:57:48+05:30
Completed At: 2026-09-29T14:57:48+05:30
File Path: `file:///D:/hireebridge-final/hireebridge-build/public/js/app.js`
Total Lines: 27
Total Bytes: 2959
Showing lines 1 to 27
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: (function(){
2:  const card=document.getElementById('certificateCard');
3:  if(card){
4:   card.addEventListener('mousemove',e=>{const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateX(${y*-4}deg) rotateY(${x*5}deg) translateY(-4px)`});
5:   card.addEventListener('mouseleave',()=>card.style.transform='rotate(2deg)');
6:  }
7:  const form=document.getElementById('checkoutForm');
8:  if(form){form.addEventListener('submit',async e=>{
9:   e.preventDefault();const btn=form.querySelector('button');btn.disabled=true;btn.textContent='Preparing checkout…';const result=document.getElementById('checkoutResult');
10:   try{
11:    const data=Object.fromEntries(new FormData(form));
12:    const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw new Error(j.error||'Checkout failed');
13:    if(j.mode==='razorpay'){
14:     if(!window.Razorpay)throw new Error('Razorpay checkout script did not load. Check your internet connection.');
15:     const rz=new Razorpay({key:j.keyId,amount:j.amount,currency:j.currency,name:'HireeBridge',description:j.description,order_id:j.gatewayOrderId,prefill:{name:data.name,email:data.email,contact:data.phone||''},theme:{color:'#0B1F36'},handler:async function(resp){
16:       result.innerHTML='<div class="demo-note">Verifying payment…</div>';
17:       const vr=await fetch('/api/payment/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:j.orderId,gatewayOrderId:resp.razorpay_order_id,paymentId:resp.razorpay_payment_id,signature:resp.razorpay_signature})});const v=await vr.json();if(!vr.ok)throw new Error(v.error||'Payment verification failed');
18:       result.innerHTML=`<div class="demo-note"><strong>Payment verified.</strong><p>Order: ${v.order.id}</p>${v.certificate?`<p>Credential: ${v.certificate.credentialId}</p><p><a href="${v.certificate.pdf}">Download PDF</a> · <a href="${v.certificate.svg}">Open certificate SVG</a></p>`:'<p>Your guided internship dashboard workflow is ready. Complete the required tasks before certificate generation.</p>'}</div>`;btn.textContent='Payment verified';
19:     },modal:{ondismiss:function(){btn.disabled=false;btn.textContent='Continue to checkout';}}});
20:     rz.open();
21:    }else{
22:     result.innerHTML=`<div class="demo-note"><strong>Local demo payment completed.</strong><p>Order: ${j.orderId}</p>${j.credentialId?`<p>Credential: ${j.credentialId}</p><p><a href="${j.files.pdf}">Download PDF</a> · <a href="${j.files.svg}">Open certificate SVG</a></p>`:'<p>Your guided dashboard flow is ready for testing. In production, configure Razorpay and generate the certificate after completion.</p>'}</div>`;btn.textContent='Completed';
23:    }
24:   }catch(err){result.innerHTML=`<div class="demo-note">${err.message}</div>`;btn.disabled=false;btn.textContent='Try again';}
25:  })}
26: })();
27: 
The above content shows the entire, complete file contents of the requested file.
