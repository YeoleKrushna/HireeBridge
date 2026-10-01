(function(){
 const card=document.getElementById('certificateCard');
 if(card){
  card.addEventListener('mousemove',e=>{const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateX(${y*-4}deg) rotateY(${x*5}deg) translateY(-4px)`});
  card.addEventListener('mouseleave',()=>card.style.transform='rotate(2deg)');
 }
 const form=document.getElementById('checkoutForm');
 if(form){form.addEventListener('submit',async e=>{
  e.preventDefault();const btn=form.querySelector('button');btn.disabled=true;btn.textContent='Preparing checkout…';const result=document.getElementById('checkoutResult');
  try{
   const data=Object.fromEntries(new FormData(form));
   const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw new Error(j.error||'Checkout failed');
   if(j.mode==='razorpay'){
    if(!window.Razorpay)throw new Error('Razorpay checkout script did not load. Check your internet connection.');
    const rz=new Razorpay({key:j.keyId,amount:j.amount,currency:j.currency,name:'HireeBridge',description:j.description,order_id:j.gatewayOrderId,prefill:{name:data.name,email:data.email,contact:data.phone||''},theme:{color:'#0B1F36'},handler:async function(resp){
      result.innerHTML='<div class="demo-note">Verifying payment…</div>';
      const vr=await fetch('/api/payment/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:j.orderId,gatewayOrderId:resp.razorpay_order_id,paymentId:resp.razorpay_payment_id,signature:resp.razorpay_signature})});const v=await vr.json();if(!vr.ok)throw new Error(v.error||'Payment verification failed');
      result.innerHTML=`<div class="demo-note"><strong>Payment verified.</strong><p>Order: ${v.order.id}</p>${v.certificate?`<p>Credential: ${v.certificate.credentialId}</p><p><a href="${v.certificate.pdf}">Download PDF</a> · <a href="${v.certificate.svg}">Open certificate SVG</a></p>`:'<p>Your guided internship dashboard workflow is ready. Complete the required tasks before certificate generation.</p>'}</div>`;btn.textContent='Payment verified';
    },modal:{ondismiss:function(){btn.disabled=false;btn.textContent='Continue to checkout';}}});
    rz.open();
   }else{
    result.innerHTML=`<div class="demo-note"><strong>Local demo payment completed.</strong><p>Order: ${j.orderId}</p>${j.credentialId?`<p>Credential: ${j.credentialId}</p><p><a href="${j.files.pdf}">Download PDF</a> · <a href="${j.files.svg}">Open certificate SVG</a></p>`:'<p>Your guided dashboard flow is ready for testing. In production, configure Razorpay and generate the certificate after completion.</p>'}</div>`;btn.textContent='Completed';
   }
  }catch(err){result.innerHTML=`<div class="demo-note">${err.message}</div>`;btn.disabled=false;btn.textContent='Try again';}
 })}
})();
