import React from 'react'
import { Slider } from "@/components/ui/slider"

export default function AlphaSlider({ value, onChange }) {
  const percentage = Math.round(value * 100);

  return (
    <div className="w-full flex flex-col space-y-2 select-none">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-zinc-300">Style Strength</span>
        <span className="text-sm font-bold text-zinc-100 font-mono">{percentage}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(val) => onChange(val[0])}
        min={0.0}
        max={1.0}
        step={0.05}
        className="py-2 cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
        <span>Content (0%)</span>
        <span>Balanced</span>
        <span>Style (100%)</span>
      </div>
    </div>
  )
}
