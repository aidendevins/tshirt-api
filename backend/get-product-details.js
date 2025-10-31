// Get full product details from Printify shop
const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6ImFkZTIzNjgwOTNmMGJiMzdiM2M3NDAwMzlkMjY2NWJjZTU5YmY5MGQ0MGNlYTZmODczMGI4ZTNiMmVlZWRjMDg2ZjNkMjI0NWI2YTVkOTk2IiwiaWF0IjoxNzYxNjU3MDA4LjIzMjkyNiwibmJmIjoxNzYxNjU3MDA4LjIzMjkyOCwiZXhwIjoxNzkzMTkzMDA4LjIyNDU3NCwic3ViIjoiMjUwNjI5MjciLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSIsInByaW50X3Byb3ZpZGVycy5yZWFkIiwidXNlci5pbmZvIl19.QQYBRFbeyMXTGi9-H-oSDGtUUDGRR0Ej0Ph18yXOYk9ZH4_ua4bPC7r1nlDSbkmlI0wJkIjPr8br-TjmbUSNPNhQoSynGjLdC3FWNIo4bbRcCR6rpQiYzbOfh4hNQg7luPpd9-YHTDKgFLJd9HxU2556ZpotQHeb26Evm1jruxvM4LUSFpEhTNmAKVkams0MKLgF7zcSC6AZJuB15O-YMpibveN2x8Lno3VcSpVuqF91CAIFvKw9AyIFf_6f6zzUT2hZSddPrCONi_1CffjD89Qwm0edFwkFdOJy5d1HBzJgM-ap6DOgfrr1D0QWQ3ibgvEPByNSeHR7PCyq7Ojl_SiSnPAnVrpnr3CtrgV2Y_sMBG1EkKkrQh5FtPurKGpcAwrvDAv2eTTnR5uVQtyiuSbCRvSIRN9M7ccLJc9i4HxnRUDtL-k7dkEr6lgy5Wo347m-NmaWTVSEK3Fa8xuLlfszV69Jk7fHOwXv40_NMu5QXFG42s5aLqB7EtluA4lC9NKXSYFD8Xasi5PMm6bgj6XOHRsS28mcVV3ef7aTabcCBOFnpvS7T2hfWhS3eD58DGqLVSCLBaAdAqJ3IAdYd5DRDX47b_3hxsM3WVVcofK04bqQW89EksflHrt7ORCp894Z7Hci9ULtwZ2r7-hQauC7R1V7ZRc3FVFwfUwtWJg';

const SHOP_ID = '25022281';
const PRODUCT_ID = '69002a71cc3996561c06c45e';

async function getProductDetails() {
  const res = await fetch(`https://api.printify.com/v1/shops/${SHOP_ID}/products/${PRODUCT_ID}.json`, {
    headers: {
      Authorization: `Bearer ${PRINTIFY_API_KEY}`,
    },
  });
  
  if (!res.ok) {
    console.error(`Error ${res.status}: ${await res.text()}`);
    return;
  }
  
  const data = await res.json();
  
  console.log('\n📦 PRODUCT IN YOUR SHOP:');
  console.log('Product ID:', data.id);
  console.log('Title:', data.title);
  console.log('Blueprint ID:', data.blueprint_id);
  console.log('Print Provider ID:', data.print_provider_id);
  
  console.log('\n📐 VARIANTS:');
  data.variants?.forEach(v => {
    console.log(`  - Variant ID: ${v.id}, Title: ${v.title || 'N/A'}, Price: $${v.price / 100}`);
  });
  
  console.log('\n🎯 LOOKING FOR VARIANT 64333:');
  const variant = data.variants?.find(v => v.id === 64333);
  if (variant) {
    console.log('  ✅ Found:', variant);
  } else {
    console.log('  ❌ NOT FOUND');
    console.log('  Available variant IDs:', data.variants?.map(v => v.id).join(', '));
  }
  
  console.log('\n💡 USE THESE IN WEBHOOK:');
  console.log(`  blueprint_id: ${data.blueprint_id}`);
  console.log(`  print_provider_id: ${data.print_provider_id}`);
  console.log(`  variant_id: ${data.variants?.[0]?.id || 'NONE'} (example)`);
}

getProductDetails();

