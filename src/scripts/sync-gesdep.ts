import { GesdepClient } from '../gesdep/actions/gesdepClient.js';
import { ListTeamsUseCase } from '../application/listTeamsUseCase.js';
import { GetPlayerUseCase } from '../application/getPlayerUseCase.js';
import { GesdepSyncService } from '../application/gesdepSyncService.js';
import { logger } from '../shared/logger.js';

const main = async () => {
  const client = new GesdepClient();
  const syncService = new GesdepSyncService({
    teamsUseCase: new ListTeamsUseCase({ navigator: client }),
    playerUseCase: new GetPlayerUseCase({ navigator: client })
  });

  const result = await syncService.syncAll();
  logger.info({ result }, 'Gesdep sync finished successfully');
};

main().catch((error) => {
  logger.error({ err: error }, 'Gesdep sync failed');
  process.exit(1);
});
