import React, { useCallback, useEffect, useState } from 'react';
import { SkeletonRows } from '../components/Skeleton.jsx';
import { createGroup, fetchGroups, subscribeToGroups } from '../utils/groupService';
import { UsersIcon } from '../components/Icons';
import { Button, EmptyState, ListButton, PageHeader, Panel, ScreenShell, SectionHeading, TextInput } from '../components/Ui.jsx';
import { useI18n } from '../i18n/useI18n.js';

export default function GroupListScreen({ showAlert, setScreen, setSelectedGroup }) {
  const { t } = useI18n();
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadGroups = useCallback(async () => {
    return fetchGroups();
  }, []);

  useEffect(() => {
    let active = true;
    loadGroups()
      .then((items) => {
        if (active) setGroups(items);
      })
      .catch((error) => {
        console.error('Error loading groups:', error);
        showAlert(t('alerts.error'), t('groups.loadError'));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadGroups, showAlert, t]);

  useEffect(() => {
    return subscribeToGroups((items) => setGroups(items));
  }, []);

  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!name) {
      showAlert(t('groups.nameRequiredTitle'), t('groups.nameRequiredMessage'));
      return;
    }

    try {
      setIsSaving(true);
      const group = await createGroup(name);
      setGroups((current) => [group, ...current]);
      setGroupName('');
      setIsCreateOpen(false);
      setSelectedGroup(group);
      setScreen('groupHome', { group });
    } catch (error) {
      console.error('Error creating group:', error);
      showAlert(t('alerts.error'), error.message || t('groups.createError'));
    } finally {
      setIsSaving(false);
    }
  };

  const openGroup = (group) => {
    setSelectedGroup(group);
    setScreen('groupHome', { group });
  };
  const hasGroups = groups.length > 0;
  const showCreateForm = !hasGroups || isCreateOpen;

  return (
    <ScreenShell withBottomNav>
      <PageHeader
        eyebrow={t('groups.eyebrow')}
        title={t('groups.title')}
        detail={hasGroups ? t('groups.savedCount', { count: groups.length, plural: groups.length === 1 ? '' : 's' }) : t('groups.detail')}
        actions={hasGroups ? <Button tone="secondary" size="sm" onClick={() => setIsCreateOpen((current) => !current)}>{isCreateOpen ? t('common.hide') : t('groups.createTitle')}</Button> : null}
      />

      <Panel>
        {isLoading ? (
          <SkeletonRows count={2} />
        ) : !hasGroups ? (
          <div className="space-y-4">
            <EmptyState title={t('groups.empty')} detail={t('groups.emptyDetail')} />
            <GroupCreateForm
              groupName={groupName}
              setGroupName={setGroupName}
              isSaving={isSaving}
              onCreate={handleCreateGroup}
              t={t}
            />
          </div>
        ) : (
          <>
            <SectionHeading title={t('groups.listTitle')} count={groups.length} />
            {showCreateForm && (
              <div className="mb-4">
                <GroupCreateForm
                  groupName={groupName}
                  setGroupName={setGroupName}
                  isSaving={isSaving}
                  onCreate={handleCreateGroup}
                  t={t}
                />
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {groups.map((group) => (
                <ListButton
                  key={group.id}
                  icon={<UsersIcon className="h-5 w-5" />}
                  title={group.name}
                  onClick={() => openGroup(group)}
                />
              ))}
            </div>
          </>
        )}
      </Panel>
    </ScreenShell>
  );
}

function GroupCreateForm({ groupName, setGroupName, isSaving, onCreate, t }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
      <TextInput
        value={groupName}
        onChange={(event) => setGroupName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onCreate();
          }
        }}
        maxLength={60}
        placeholder={t('groups.namePlaceholder')}
        autoCapitalize="words"
        autoComplete="organization"
        enterKeyHint="done"
      />
      <Button onClick={onCreate} disabled={isSaving} size="lg">
        <UsersIcon className="h-5 w-5" />
        {t('common.create')}
      </Button>
    </div>
  );
}
