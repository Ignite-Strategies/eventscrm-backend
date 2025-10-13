import { getPrismaClient } from './config/database.js';

const prisma = getPrismaClient();

async function checkFormFields() {
  try {
    const forms = await prisma.publicForm.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        fields: true
      }
    });
    
    console.log('📋 PUBLIC FORMS AND THEIR FIELDS:\n');
    
    forms.forEach(form => {
      console.log(`\n🎯 Form: ${form.title} (${form.slug})`);
      console.log(`   ID: ${form.id}`);
      console.log(`   Fields:`);
      
      if (form.fields) {
        const fields = Array.isArray(form.fields) ? form.fields : JSON.parse(form.fields);
        fields.forEach(field => {
          console.log(`     - ${field.label || field.id} (${field.type}) [id: ${field.id}]`);
          if (field.options) {
            console.log(`       Options: ${field.options.map(o => o.label || o.value).join(', ')}`);
          }
        });
      } else {
        console.log('     (No custom fields)');
      }
    });
    
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkFormFields();

