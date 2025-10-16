/**
 * Migration Script: Create Contact records for OrgMembers without contactId
 * 
 * This fixes the issue where old OrgMember records don't have a contactId,
 * causing 404s when clicking on their name.
 */

import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

async function migrateOrgMembersToContacts() {
  try {
    console.log('🔍 Finding OrgMembers without contactId...');
    
    // Find all OrgMembers where contactId is null
    const orphanedOrgMembers = await prisma.orgMember.findMany({
      where: {
        contactId: null
      }
    });
    
    console.log(`📊 Found ${orphanedOrgMembers.length} OrgMembers without Contact records`);
    
    if (orphanedOrgMembers.length === 0) {
      console.log('✅ All OrgMembers already have Contact records!');
      return;
    }
    
    let created = 0;
    let errors = [];
    
    for (const orgMember of orphanedOrgMembers) {
      try {
        // Check if a Contact already exists with this email
        let contact = await prisma.contact.findUnique({
          where: { email: orgMember.email }
        });
        
        if (!contact) {
          // Create new Contact record
          contact = await prisma.contact.create({
            data: {
              firstName: orgMember.firstName || 'Unknown',
              lastName: orgMember.lastName || '',
              email: orgMember.email,
              phone: orgMember.phone,
              goesBy: orgMember.goesBy,
              employer: orgMember.employer,
              street: orgMember.street,
              city: orgMember.city,
              state: orgMember.state,
              zip: orgMember.zip,
              birthday: orgMember.birthday,
              married: orgMember.married || false,
              spouseName: orgMember.spouseName,
              numberOfKids: orgMember.numberOfKids || 0,
              orgId: orgMember.orgId  // Keep org association
            }
          });
          created++;
          console.log(`✅ Created Contact for: ${orgMember.email}`);
        } else {
          console.log(`♻️  Found existing Contact for: ${orgMember.email}`);
        }
        
        // Link the OrgMember to the Contact
        await prisma.orgMember.update({
          where: { id: orgMember.id },
          data: { contactId: contact.id }
        });
        
        console.log(`🔗 Linked OrgMember ${orgMember.id} → Contact ${contact.id}`);
        
      } catch (error) {
        console.error(`❌ Error migrating ${orgMember.email}:`, error.message);
        errors.push({
          email: orgMember.email,
          error: error.message
        });
      }
    }
    
    console.log('\n📊 Migration Complete:');
    console.log(`   ✅ Contacts created: ${created}`);
    console.log(`   🔗 OrgMembers linked: ${orphanedOrgMembers.length - errors.length}`);
    console.log(`   ❌ Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(err => console.log(`   - ${err.email}: ${err.error}`));
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateOrgMembersToContacts();

