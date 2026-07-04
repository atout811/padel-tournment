import React, { useEffect, useMemo, useState } from 'react';
import { CourtIcon, SparkIcon, TrophyIcon, UsersIcon } from '../components/Icons';
import { ListButton, PageHeader, ScreenShell } from '../components/Ui.jsx';
import { fetchGroups, subscribeToGroups } from '../utils/groupService';
import { fetchTournamentHistory } from '../utils/tournamentService';
import { useI18n } from '../i18n/useI18n.js';

export default function HomeScreen({ setScreen, selectedGroup, onResumeTournament, showAlert }) {
  const { t } = useI18n();
  const [resumeTournament, setResumeTournament] = useState(null);
  const [groupNames, setGroupNames] = useState(new Map());

  useEffect(() => {
    let active = true;

    Promise.allSettled([fetchTournamentHistory(), fetchGroups()])
      .then(([historyResult, groupsResult]) => {
        if (!active) return;

        if (historyResult.status === 'fulfilled') {
          setResumeTournament(historyResult.value.find((tournament) => tournament.status !== 'ended') || null);
        } else {
          console.error('Error loading active tournament:', historyResult.reason);
          setResumeTournament(null);
        }

        if (groupsResult.status === 'fulfilled') {
          setGroupNames(new Map(groupsResult.value.map((group) => [group.id, group.name])));
        } else {
          console.error('Error loading home group names:', groupsResult.reason);
          setGroupNames(new Map());
        }
      })
      .catch((error) => {
        console.error('Error loading home data:', error);
        setResumeTournament(null);
        showAlert?.(t('home.loadErrorTitle'), t('home.loadErrorMessage'));
      });

    return () => {
      active = false;
    };
  }, [showAlert, t]);

  useEffect(() => {
    return subscribeToGroups((groups) => {
      setGroupNames(new Map(groups.map((group) => [group.id, group.name])));
    });
  }, []);

  const resumeSummary = useMemo(() => getResumeSummary(resumeTournament, groupNames, t), [groupNames, resumeTournament, t]);

  return (
    <ScreenShell withBottomNav>
      <PageHeader eyebrow={t('home.eyebrow')} title={t('home.title')} detail={t('home.detail')} />

      <section className="space-y-2">
        {resumeTournament && (
          <HomeRow
            icon={<TrophyIcon className="h-6 w-6" />}
            title={resumeSummary.title}
            detail={resumeSummary.detail}
            onClick={() => onResumeTournament(resumeTournament)}
          />
        )}
        {selectedGroup && (
          <HomeRow
            icon={<CourtIcon className="h-6 w-6" />}
            title={selectedGroup.name}
            detail={t('home.selectedGroupDetail')}
            onClick={() => setScreen('groupHome', { group: selectedGroup })}
          />
        )}
        <HomeRow icon={<UsersIcon className="h-6 w-6" />} title={t('home.groupsTitle')} detail={t('home.groupsDetail')} onClick={() => setScreen('groups')} />
        <HomeRow icon={<TrophyIcon className="h-6 w-6" />} title={t('home.quickTitle')} detail={t('home.quickDetail')} onClick={() => setScreen('setup')} />
      </section>
    </ScreenShell>
  );
}

function getResumeSummary(tournament, groupNames, t) {
  if (!tournament) {
    return { title: '', detail: '' };
  }

  const format = tournament.format === 'league' ? t('common.league') : t('common.cup');
  const groupName = groupNames.get(tournament.groupId);
  const label = groupName || (tournament.groupId ? t('format.groupNight') : tournament.format === 'league' ? t('format.quickLeagueNight') : t('format.quickCupNight'));
  const totalMatches = tournament.matches?.length || 0;
  const completedMatches = tournament.matches?.filter((match) => match.status === 'completed').length || 0;

  return {
    title: t('home.resumeTitle', { label }),
    detail: t('home.resumeDetail', { format, completed: completedMatches, total: totalMatches }),
  };
}

function HomeRow({ icon, title, detail, onClick }) {
  return (
    <ListButton
      icon={icon}
      title={title}
      detail={detail}
      onClick={onClick}
      actionIcon={<SparkIcon className="h-5 w-5" />}
    />
  );
}
