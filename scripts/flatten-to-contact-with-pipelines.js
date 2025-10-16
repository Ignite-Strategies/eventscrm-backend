/**
 * Migration Script: Flatten OrgMember & EventAttendee to Contact
 * Adds pipeline support for targeting
 */

import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

async function migrateToFlatContact() {
  console.log('🚀 Starting migration to flat Contact model with Pipelines...\n');

  try {
    // ============================================
    // STEP 1: Migrate OrgMember → Contact
    // ============================================
    console.log('📊 STEP 1: Migrating OrgMember data to Contact...');
    
    const orgMembers = await prisma.orgMember.findMany({
      include: { 
        contact: true,
        engagement: true 
      }
    });

    console.log(`   Found ${orgMembers.length} OrgMembers to migrate`);

    let orgMembersMigrated = 0;
    for (const om of orgMembers) {
      if (!om.contact) {
        console.log(`   ⚠️  Skipping OrgMember ${om.id} - no Contact linked`);
        continue;
      }

      await prisma.contact.update({
        where: { id: om.contactId },
        data: {
          // Org relationship
          orgId: om.orgId,
          isOrgMember: true,
          
          // Org-specific fields
          yearsWithOrganization: om.yearsWithOrganization,
          leadershipRole: om.leadershipRole,
          orgNotes: om.notes,
          chapterResponsibleFor: om.chapterresponsiblefor,
          orgTags: om.tags || [],
          
          // Engagement
          engagementValue: om.engagement?.value,
          
          // Preserve goesBy if exists on OrgMember and not on Contact
          goesBy: om.contact.goesBy || om.goesBy
        }
      });

      orgMembersMigrated++;
    }

    console.log(`   ✅ Migrated ${orgMembersMigrated} OrgMembers to Contact\n`);

    // ============================================
    // STEP 2: Migrate EventAttendee → Contact
    // ============================================
    console.log('📊 STEP 2: Migrating EventAttendee data to Contact...');
    console.log('   (Using LATEST event per contact only)');

    const allAttendees = await prisma.eventAttendee.findMany({
      orderBy: { createdAt: 'desc' },
      include: { contact: true }
    });

    console.log(`   Found ${allAttendees.length} total EventAttendee records`);

    // Get latest event per contact
    const latestEventPerContact = {};
    for (const ea of allAttendees) {
      if (!latestEventPerContact[ea.contactId]) {
        latestEventPerContact[ea.contactId] = ea;
      }
    }

    const uniqueContactsWithEvents = Object.keys(latestEventPerContact).length;
    console.log(`   ${uniqueContactsWithEvents} unique contacts have events`);

    let eventAttendeesMigrated = 0;
    for (const ea of Object.values(latestEventPerContact)) {
      if (!ea.contact) {
        console.log(`   ⚠️  Skipping EventAttendee ${ea.id} - no Contact linked`);
        continue;
      }

      await prisma.contact.update({
        where: { id: ea.contactId },
        data: {
          // Event relationship
          eventId: ea.eventId,
          
          // Event-specific fields
          audienceType: ea.audienceType,
          currentStage: ea.currentStage,
          attended: ea.attended,
          amountPaid: ea.amountPaid,
          ticketType: ea.ticketType,
          
          // Party details
          spouseOrOther: ea.spouseOrOther,
          howManyInParty: ea.howManyInParty,
          
          // Form tracking
          submittedFormId: ea.submittedFormId
        }
      });

      eventAttendeesMigrated++;
    }

    console.log(`   ✅ Migrated ${eventAttendeesMigrated} EventAttendees to Contact\n`);

    // ============================================
    // STEP 3: Create Default Pipelines for Events
    // ============================================
    console.log('📊 STEP 3: Creating default Pipelines for Events...');

    const events = await prisma.event.findMany({
      where: { status: 'upcoming' }
    });

    console.log(`   Found ${events.length} upcoming events`);

    let pipelinesCreated = 0;
    for (const event of events) {
      const pipeline = await prisma.pipeline.create({
        data: {
          name: `${event.name} - Event Funnel`,
          type: 'event',
          orgId: event.orgId,
          audiences: ['org_members', 'prospects', 'donors', 'vip'],
          stages: ['aware', 'invited', 'rsvped', 'paid', 'attended'],
          isActive: true
        }
      });

      // Link contacts for this event to the pipeline
      await prisma.contact.updateMany({
        where: { eventId: event.id },
        data: { pipelineId: pipeline.id }
      });

      pipelinesCreated++;
    }

    console.log(`   ✅ Created ${pipelinesCreated} event pipelines\n`);

    // ============================================
    // STEP 4: Summary Stats
    // ============================================
    console.log('📊 STEP 4: Migration Summary...\n');

    const totalContacts = await prisma.contact.count();
    const contactsWithOrg = await prisma.contact.count({ where: { orgId: { not: null } } });
    const contactsWithEvent = await prisma.contact.count({ where: { eventId: { not: null } } });
    const contactsWithPipeline = await prisma.contact.count({ where: { pipelineId: { not: null } } });
    const orgMembersCount = await prisma.contact.count({ where: { isOrgMember: true } });

    console.log('   📈 Final Stats:');
    console.log(`      Total Contacts: ${totalContacts}`);
    console.log(`      Contacts with Org: ${contactsWithOrg}`);
    console.log(`      Contacts with Event: ${contactsWithEvent}`);
    console.log(`      Contacts with Pipeline: ${contactsWithPipeline}`);
    console.log(`      Org Members: ${orgMembersCount}`);
    console.log('');

    console.log('✅ Migration Complete!');
    console.log('');
    console.log('⚠️  NEXT STEPS:');
    console.log('   1. Review the data in Contact table');
    console.log('   2. Run: npx prisma migrate dev --name flatten-to-contact');
    console.log('   3. This will DROP OrgMember and EventAttendee tables');
    console.log('   4. Update backend routes to use Contact directly');
    console.log('   5. Update frontend to use /contacts endpoints');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run it!
migrateToFlatContact();

