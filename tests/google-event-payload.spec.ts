import { test, expect } from '@playwright/test'
import { buildGoogleEventPayload, validateReminderMinutes, type EventPayloadSource } from '../supabase/functions/_shared/google-event-payload'

function source(overrides: Partial<EventPayloadSource> = {}): EventPayloadSource {
  return {
    titulo: 'Fim das inscrições', tipo: 'inscricao', data_inicio: '2026-10-05T03:00:00.000Z', data_fim: null,
    dia_inteiro: true, descricao: 'Confira o edital.',
    editais: {
      titulo: 'Mestrado 2026', instituicao: 'UEMA',
      link_pagina: 'https://uema.br/edital', link_inscricao: 'https://uema.br/inscricao',
    },
    ...overrides,
  }
}

test('evento de dia inteiro converte período inclusivo para end.date exclusivo', () => {
  const single = buildGoogleEventPayload(source(), 'America/Fortaleza', [10080, 4320, 1440, 0])
  expect(single.start).toEqual({ date: '2026-10-05' })
  expect(single.end).toEqual({ date: '2026-10-06' })

  const period = buildGoogleEventPayload(source({ data_fim: '2026-10-09T03:00:00.000Z' }), 'America/Fortaleza', [])
  expect(period.start).toEqual({ date: '2026-10-05' })
  expect(period.end).toEqual({ date: '2026-10-10' })
})

test('período de inscrição com frequência a cada 2 dias inclui início, dia seguinte e fim', () => {
  const payload = buildGoogleEventPayload(source({
    data_inicio: '2026-09-29T03:00:00.000Z',
    data_fim: '2026-10-13T03:00:00.000Z',
    lembrete_modo: 'frequencia',
    lembrete_intervalo_dias: 2,
  }), 'America/Fortaleza', [0])

  expect(payload.start).toEqual({ date: '2026-09-29' })
  expect(payload.end).toEqual({ date: '2026-09-30' })
  expect(payload.recurrence).toEqual([
    'RDATE;VALUE=DATE:20260930,20261002,20261004,20261006,20261008,20261010,20261012,20261013',
  ])
})

test('período de inscrição permite selecionar datas específicas, mantendo início e fim', () => {
  const payload = buildGoogleEventPayload(source({
    data_inicio: '2026-09-29T03:00:00.000Z',
    data_fim: '2026-10-13T03:00:00.000Z',
    lembrete_modo: 'datas',
    lembrete_datas: ['2026-10-04', '2026-10-08'],
  }), 'America/Fortaleza', [0])

  expect(payload.recurrence).toEqual([
    'RDATE;VALUE=DATE:20261004,20261008,20261013',
  ])
})

test('evento com horário usa timezone configurado e assume duração de uma hora sem data final', () => {
  const timed = buildGoogleEventPayload(source({
    dia_inteiro: false,
    data_inicio: '2026-10-05T13:00:00.000Z',
  }), 'America/Fortaleza', [])
  expect(timed.start).toEqual({ dateTime: '2026-10-05T13:00:00.000Z', timeZone: 'America/Fortaleza' })
  expect(timed.end).toEqual({ dateTime: '2026-10-05T14:00:00.000Z', timeZone: 'America/Fortaleza' })

  const manausAllDay = buildGoogleEventPayload(source({ data_inicio: '2026-10-05T04:00:00.000Z' }), 'America/Manaus', [])
  expect(manausAllDay.start).toEqual({ date: '2026-10-05' })
})

test('payload contém lembretes popup e os dados contextuais essenciais', () => {
  const payload = buildGoogleEventPayload(source(), 'America/Fortaleza', [10080, 4320, 1440, 0])
  expect(payload.summary).toBe('[EditalTrack] Fim das inscrições')
  expect(payload.reminders).toEqual({
    useDefault: false,
    overrides: [10080, 4320, 1440, 0].map((minutes) => ({ method: 'popup', minutes })),
  })
  expect(payload.description).toContain('Edital: Mestrado 2026')
  expect(payload.description).toContain('Instituição: UEMA')
  expect(payload.description).toContain('Página oficial: https://uema.br/edital')
  expect(payload.description).toContain('Criado automaticamente pelo EditalTrack.')
})

test('valida máximo de overrides, valores e duplicatas de lembrete', () => {
  expect(validateReminderMinutes([0, 1, 2, 3, 4])).toHaveLength(5)
  expect(() => validateReminderMinutes([0, 1, 2, 3, 4, 5])).toThrow('reminder_limit_exceeded')
  expect(() => validateReminderMinutes([10, 10])).toThrow('reminder_limit_exceeded')
  expect(() => validateReminderMinutes([40321])).toThrow('reminder_limit_exceeded')
})
