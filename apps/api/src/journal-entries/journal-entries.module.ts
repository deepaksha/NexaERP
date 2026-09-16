import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JournalEntryEntity } from './journal-entry.entity';
import { JournalEntriesController } from './journal-entries.controller';
import { JournalEntriesService } from './journal-entries.service';

@Module({
  imports: [TypeOrmModule.forFeature([JournalEntryEntity])],
  controllers: [JournalEntriesController],
  providers: [JournalEntriesService],
  exports: [JournalEntriesService],
})
export class JournalEntriesModule {}
