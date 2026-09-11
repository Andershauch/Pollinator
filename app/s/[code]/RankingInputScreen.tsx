"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import s from "./participant.module.css";
import { TopBar, ParticipantTimer, MediaBlock, type Question } from "./ParticipantClient";

function RankingRow({ optionIndex, label, position }: { optionIndex: number; label: string; position: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(optionIndex),
  });

  return (
    <div
      ref={setNodeRef}
      className={`${s.rankRow}${isDragging ? ` ${s.rankRowDragging}` : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <span className={s.rankNum}>{position + 1}</span>
      <span className={s.rankLabel}>{label}</span>
      <span className={s.rankHandle} {...attributes} {...listeners}>☰</span>
    </div>
  );
}

export default function RankingInputScreen({
  question,
  qNum,
  submitting,
  onSubmit,
}: {
  question: Question;
  qNum: number;
  submitting: boolean;
  onSubmit: (ranking: number[]) => void;
}) {
  const [order, setOrder] = useState<number[]>(() => question.options.map((_, i) => i));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.findIndex((i) => String(i) === active.id);
      const newIndex = prev.findIndex((i) => String(i) === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  return (
    <div className={s.screen}>
      <TopBar right={
        <div className={s.topRight}>
          <span className={s.tag}>SPØRGSMÅL {qNum}</span>
          <ParticipantTimer openedAt={question.opened_at} durationSec={question.duration_seconds} />
        </div>
      } />
      <div className={s.qHead}>
        {question.media_url && question.media_type && (
          <MediaBlock url={question.media_url} type={question.media_type} />
        )}
        <h1 className={s.qText}>{question.prompt}</h1>
      </div>
      <div className={s.rankArea}>
        <div className={s.rankHint}>Træk emnerne så det vigtigste er øverst</div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order.map(String)} strategy={verticalListSortingStrategy}>
            <div className={s.rankList}>
              {order.map((optionIndex, position) => (
                <RankingRow
                  key={optionIndex}
                  optionIndex={optionIndex}
                  label={question.options[optionIndex]}
                  position={position}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <button
          className={s.scaleSubmit}
          onClick={() => onSubmit(order)}
          disabled={submitting}
        >
          {submitting ? "Sender…" : "Send rangering"}
        </button>
      </div>
    </div>
  );
}
