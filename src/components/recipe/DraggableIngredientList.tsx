"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  Modifier
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { UseFormRegister, FieldErrors } from "react-hook-form"
import { Ingredient } from "@/types/item"

// 🎯 드래그앤드롭용 확장 타입 (id 필드 추가)
export interface DraggableIngredient extends Ingredient {
  id: string
}

interface DraggableIngredientListProps {
  ingredients: DraggableIngredient[]
  onReorder: (newOrder: DraggableIngredient[]) => void
  register: UseFormRegister<any>
  errors: FieldErrors<any>
  onRemove: (index: number) => void
}

interface SortableIngredientItemProps {
  ingredient: DraggableIngredient
  index: number
  register: UseFormRegister<any>
  errors: FieldErrors<any>
  onRemove: (index: number) => void
}

// 🎯 미니멀 드래그 핸들 - 기능 중심
function DragHandle() {
  return (
    <div 
      data-drag-handle
      aria-label="끌어서 순서 바꾸기"
      className="-ml-2 flex h-11 w-9 cursor-grab touch-manipulation items-center justify-center text-ink-soft active:cursor-grabbing"
    >
      <div className="flex flex-col gap-0.5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-2.5 h-0.5 rounded-full bg-current" />
        ))}
      </div>
    </div>
  )
}

// 개별 재료 아이템 컴포넌트 
function SortableIngredientItem({ 
  ingredient, 
  index, 
  register, 
  errors, 
  onRemove,
}: SortableIngredientItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ingredient.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        border-b border-border bg-paper py-3 last:border-b-0
        ${isDragging ? 'relative z-10 shadow-sheet' : ''}
      `}
    >
      <div className="flex items-start gap-1">
        {/* 드래그 핸들 */}
        <div {...attributes} {...listeners}>
          <DragHandle />
        </div>

        {/* 모바일 최적화 재료 입력 영역 */}
        <div className="flex-1 space-y-2">
          {/* 1행: 재료명 (전체 너비) */}
          <Input 
            placeholder="재료 이름 (예: 대파)" 
            aria-label={`${index + 1}번째 재료 이름`}
            {...register(`ingredients.${index}.name`)} 
            className="h-11 w-full" 
          />
          
          {/* 2행: 수량 + 단위 + 삭제버튼 */}
          <div className="flex gap-2">
            <Input 
              type="number" 
              step="any"
              inputMode="decimal"
              placeholder="양" 
              aria-label={`${index + 1}번째 재료 양`}
              {...register(`ingredients.${index}.amount`)} 
              className="h-11 flex-1 text-right tabular-nums" 
            />
            <Input 
              placeholder="단위 (g, 큰술)" 
              aria-label={`${index + 1}번째 재료 단위`}
              {...register(`ingredients.${index}.unit`)} 
              className="h-11 flex-1" 
            />
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={() => onRemove(index)} 
              aria-label={`${index + 1}번째 재료 지우기`}
              className="h-11 w-11 shrink-0 text-ink-soft hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          
          {/* 에러 메시지 */}
          {errors.ingredients && Array.isArray(errors.ingredients) && errors.ingredients[index] && (
            <div className="space-y-1 text-sm text-destructive">
              {(errors.ingredients[index] as any)?.name?.message && (
                <p>{(errors.ingredients[index] as any)?.name?.message}</p>
              )}
              {(errors.ingredients[index] as any)?.amount?.message && (
                <p>{(errors.ingredients[index] as any)?.amount?.message}</p>
              )}
              {(errors.ingredients[index] as any)?.unit?.message && (
                <p>{(errors.ingredients[index] as any)?.unit?.message}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 드래그 오버레이 컴포넌트 - 원본과 일치
function DragOverlayItem({ ingredient }: { ingredient: DraggableIngredient }) {
  return (
    <div 
      className="pointer-events-none rounded-[3px] border border-ink/30 bg-paper p-3 shadow-sheet"
      style={{ 
        width: '100%',
        maxWidth: '90vw',
        minWidth: '280px',
        transform: 'rotate(2deg)',
        zIndex: 9999,
        touchAction: 'none',
        userSelect: 'none'
      }}
    >
      <div className="flex items-center gap-3">
        <DragHandle />
        
        <div className="flex-1 space-y-2">
          {/* 1행: 재료명 */}
          <div className="bg-door rounded-md px-3 py-2 text-sm">
            {ingredient.name || '재료명'}
          </div>
          
          {/* 2행: 수량 + 단위 + 삭제버튼 영역 */}
          <div className="flex gap-2">
            <div className="flex-1 bg-door rounded-md px-3 py-2 text-sm text-center">
              {ingredient.amount || ''}
            </div>
            <div className="flex-1 bg-door rounded-md px-3 py-2 text-sm text-center">
              {ingredient.unit || ''}
            </div>
            <div className="w-9 h-9"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 메인 드래그앤드롭 리스트 컴포넌트
export default function DraggableIngredientList({
  ingredients,
  onReorder,
  register,
  errors,
  onRemove
}: DraggableIngredientListProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 데스크탑에서 약간의 여유
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,    // 모바일에서 스크롤과 구분하기 위해 증가
        tolerance: 12, // 터치 허용 오차 증가
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
    
    // 햅틱 피드백
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      navigator.vibrate(50) // 50ms 햅틱 피드백
    }
    
    // 드래그 중 스크롤 차단
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    }
  }

  // 커서 위치 조정 (핸들 크기에 맞춤)
  const cursorModifier: Modifier = ({ transform }) => {
    return {
      ...transform,
      x: transform.x - 15,  // 좌측 상단 기준
      y: transform.y + 5,
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event


    if (active.id !== over?.id && over) {
      const oldIndex = ingredients.findIndex((item) => item.id === active.id)
      const newIndex = ingredients.findIndex((item) => item.id === over.id)

      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(ingredients, oldIndex, newIndex)
        onReorder(newOrder)

      }
    } else {

    }

    setActiveId(null)
    
    // 스크롤 복원
    if (typeof document !== 'undefined') {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }

  const activeIngredient = activeId ? ingredients.find(item => item.id === activeId) : null

  return (
    <div 
      className="select-none"
      style={{ 
        touchAction: 'pan-y',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      <DndContext 
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ingredients.map(item => item.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {ingredients.map((ingredient, index) => (
              <SortableIngredientItem
                key={ingredient.id}
                ingredient={ingredient}
                index={index}
                register={register}
                errors={errors}
                onRemove={onRemove}
              />
            ))}
          </div>
        </SortableContext>

        {/* 드래그 오버레이 */}
        {typeof document !== 'undefined' && createPortal(
          <DragOverlay modifiers={[cursorModifier]}>
            {activeIngredient ? (
              <DragOverlayItem ingredient={activeIngredient} />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  )
}