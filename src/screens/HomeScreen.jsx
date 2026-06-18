import React, { useEffect, useMemo, useState } from 'react';
import { CourtIcon, SparkIcon, TrophyIcon, UsersIcon } from '../components/Icons';
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
    <div className="space-y-3 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-3 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6">
      <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#BEDC45]">{t('home.eyebrow')}</p>
        <h2 className="mt-1 text-2xl font-black leading-tight text-[#F7F8F7] sm:text-3xl">{t('home.title')}</h2>
      </section>

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
    </div>
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
    <button
      type="button"
      onClick={onClick}
      className="grid min-h-20 w-full grid-cols-[48px_1fr_auto] items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-3 text-left shadow-sm transition hover:border-[rgba(190,220,69,0.32)] hover:bg-[#07111B] active:scale-[0.99]"
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#BEDC45]/14 text-[#BEDC45]">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-lg font-black text-[#F7F8F7]">{title}</span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-[#8D99A6]">{detail}</span>
      </span>
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#BEDC45] text-[#020D16]">
        <SparkIcon className="h-5 w-5" />
      </span>
    </button>
  );
}
