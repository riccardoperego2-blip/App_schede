import { useCallback, useState } from 'react';

import { ScrollView, View, Pressable, ActivityIndicator, RefreshControl } from 'react-native';

import { useFocusEffect } from 'expo-router';

import { Screen, Text, Card, Button } from '../../design-system';

import { useAnalyticsOverview } from '../../hooks/use-analytics';

import {
  formatAdherencePercent,
  formatAnalyticsVolume,
  formatWeekLabel,
} from '../../lib/api/mappers/analytics-overview';



const RANGES = ['4w', '12w', '6m'] as const;



export function ProgressScreen() {

  const [range, setRange] = useState<(typeof RANGES)[number]>('4w');

  const { data, isLoading, isError, error, isRefetching, refetch } = useAnalyticsOverview(range);



  useFocusEffect(

    useCallback(() => {

      void refetch();

    }, [refetch]),

  );



  const hasData =

    !!data &&

    (data.completedSessions > 0 ||

      data.sessionsThisWeek > 0 ||

      data.weeklyVolumeSeries.some((w) => w.volumeKg > 0));



  if (isLoading && !data) {

    return (

      <Screen>

        <View className="flex-1 items-center justify-center gap-3">

          <ActivityIndicator color="#5BE3A1" />

          <Text tone="muted">Caricamento progressi…</Text>

        </View>

      </Screen>

    );

  }



  if (isError && !data) {

    return (

      <Screen>

        <View className="gap-4 px-1 pt-2">

          <Text variant="display">Progressi</Text>

          <Text variant="subtitle">Impossibile caricare i dati</Text>

          <Text tone="muted">{(error as Error).message}</Text>

          <Button label="Riprova" onPress={() => void refetch()} />

        </View>

      </Screen>

    );

  }



  return (

    <Screen>

      <ScrollView

        showsVerticalScrollIndicator={false}

        contentContainerStyle={{ paddingBottom: 32, gap: 16 }}

        refreshControl={

          <RefreshControl tintColor="#5BE3A1" refreshing={isRefetching} onRefresh={() => void refetch()} />

        }

      >

        <View>

          <Text variant="display">Progressi</Text>

          <Text tone="muted">Volume, aderenza, frequenza.</Text>

        </View>



        <View className="flex-row gap-2">

          {RANGES.map((r) => (

            <Pressable

              key={r}

              onPress={() => setRange(r)}

              className={`flex-1 rounded-pill p-2 ${range === r ? 'bg-accent' : 'bg-bg-elevated'}`}

            >

              <Text

                tone={range === r ? 'inverse' : 'secondary'}

                variant="caption"

                className="text-center font-semibold"

              >

                {r.toUpperCase()}

              </Text>

            </Pressable>

          ))}

        </View>



        {!hasData ? (

          <Card elevated className="gap-2">

            <Text variant="subtitle">Nessun dato nel periodo</Text>

            <Text tone="muted">Completa almeno una sessione per vedere i progressi.</Text>

            <Button label="Aggiorna" variant="secondary" onPress={() => void refetch()} />

          </Card>

        ) : null}



        <View className="flex-row gap-3">

          <Card elevated className="flex-1 gap-1">

            <Text variant="caption" tone="muted">

              SESSIONI

            </Text>

            <Text variant="title">{data?.completedSessions ?? 0}</Text>

            <Text variant="tiny" tone="muted">

              {range.toUpperCase()}

            </Text>

          </Card>

          <Card elevated className="flex-1 gap-1">

            <Text variant="caption" tone="muted">

              STREAK

            </Text>

            <Text variant="title">{data?.streakDays ?? 0} giorni</Text>

            <Text variant="tiny" tone="muted">

              Questa sett. {data?.sessionsThisWeek ?? 0}

            </Text>

          </Card>

        </View>



        <Card elevated className="gap-1">

          <Text variant="caption" tone="muted">

            VOLUME TOTALE

          </Text>

          <Text variant="display">{formatAnalyticsVolume(data?.totalVolumeKg)}</Text>

          <Text variant="tiny" tone="muted">

            Nel periodo selezionato

          </Text>

        </Card>



        <Card elevated>

          <Text variant="caption" tone="muted">

            ADERENZA

          </Text>

          <Text variant="display">{data ? formatAdherencePercent(data.adherencePct) : '—'}</Text>

        </Card>



        <Card className="gap-3">

          <Text variant="subtitle">Volume settimanale</Text>

          {data?.weeklyVolumeSeries.length ? (

            data.weeklyVolumeSeries.map((week) => (

              <View key={week.weekStart} className="flex-row items-center justify-between">

                <Text tone="muted">{formatWeekLabel(week.weekStart)}</Text>

                <Text>{week.volumeKg > 0 ? `${Math.round(week.volumeKg)} kg` : '—'}</Text>

              </View>

            ))

          ) : (

            <Text tone="muted">Nessun volume registrato.</Text>

          )}

        </Card>



        <Card className="gap-3">

          <Text variant="subtitle">Distribuzione muscolare</Text>

          {data?.muscleDistribution.length ? (

            data.muscleDistribution.map((row) => (

              <View key={row.muscleGroup} className="flex-row items-center justify-between">

                <Text tone="muted">{row.muscleGroup}</Text>

                <Text>

                  {row.sets} {row.sets === 1 ? 'serie' : 'serie'}

                </Text>

              </View>

            ))

          ) : (

            <Text tone="muted">Dati muscolari non disponibili.</Text>

          )}

        </Card>

      </ScrollView>

    </Screen>

  );

}


