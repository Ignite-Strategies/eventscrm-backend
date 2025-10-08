import { getPrismaClient } from './config/database.js';

const prisma = getPrismaClient();

async function migrateAdmin() {
  try {
    console.log('🔍 Finding Adam Cole...');
    
    // Find Adam's OrgMember record
    const adamOrgMember = await prisma.orgMember.findFirst({
      where: {
        email: 'adam.cole.novadude@gmail.com'
      }
    });
    
    if (!adamOrgMember) {
      console.log('❌ Adam OrgMember not found');
      return;
    }
    
    console.log('✅ Found Adam OrgMember:', adamOrgMember.id);
    
    // Check if Adam has a Contact record
    let adamContact;
    if (adamOrgMember.contactId) {
      adamContact = await prisma.contact.findUnique({
        where: { id: adamOrgMember.contactId }
      });
    }
    
    // If no Contact record, create one
    if (!adamContact) {
      adamContact = await prisma.contact.create({
        data: {
          orgId: adamOrgMember.orgId,
          firstName: adamOrgMember.firstName,
          lastName: adamOrgMember.lastName,
          email: adamOrgMember.email,
          phone: adamOrgMember.phone
        }
      });
      
      // Update OrgMember to link to Contact
      await prisma.orgMember.update({
        where: { id: adamOrgMember.id },
        data: { contactId: adamContact.id }
      });
      
      console.log('✅ Created Contact record:', adamContact.id);
    } else {
      console.log('✅ Found existing Contact:', adamContact.id);
    }
    
    // Find F3 Capital org
    const f3Org = await prisma.organization.findFirst({
      where: {
        name: 'F3 Capital'
      }
    });
    
    if (!f3Org) {
      console.log('❌ F3 Capital org not found');
      return;
    }
    
    console.log('✅ Found F3 Capital org:', f3Org.id);
    
    // Create Admin record for Adam
    const admin = await prisma.admin.create({
      data: {
        contactId: adamContact.id,
        orgId: f3Org.id,
        role: 'super_admin',
        permissions: {
          canCreateForms: true,
          canEditForms: true,
          canDeleteForms: true,
          canManageUsers: true,
          canViewAnalytics: true
        },
        isActive: true
      }
    });
    
    console.log('✅ Created Admin record:', admin.id);
    console.log('🎉 Migration complete!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAdmin();
