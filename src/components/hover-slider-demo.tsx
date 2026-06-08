"use client"

import {
  HoverSlider,
  HoverSliderImage,
  HoverSliderImageWrap,
  TextStaggerHover,
} from "@/components/blocks/animated-slideshow"

const SLIDES = [
  {
    id: "slide-1",
    title: "CONTEST PREP",
    imageUrl: "/images/aman-contest-prep.png",
  },
  {
    id: "slide-2",
    title: "FAT LOSS",
    imageUrl: "/images/aman-fat-loss.png",
  },
  {
    id: "slide-3",
    title: "MUSCLE BUILDING",
    imageUrl: "/images/aman-muscle-building.png",
  },
  {
    id: "slide-4",
    title: "ANTENATAL & POSTNATAL",
    imageUrl: "/images/aman-antenatal.png",
  },
]

export function HoverSliderDemo() {
  return (
    <HoverSlider className="min-h-svh place-content-center p-6 md:px-12 bg-[#0a0a0a] text-[#ffffff]">
      <h3 className="mb-6 text-xs font-medium uppercase tracking-wide text-[#FFB800]">
        / services
      </h3>
      <div className="flex flex-wrap items-center justify-evenly gap-6 md:gap-12">
        <div className="flex flex-col space-y-2 md:space-y-4">
          {SLIDES.map((slide, index) => (
            <TextStaggerHover
              key={slide.title}
              index={index}
              className="cursor-pointer text-4xl font-bold uppercase tracking-tighter"
              text={slide.title}
            />
          ))}
        </div>
        <HoverSliderImageWrap>
          {SLIDES.map((slide, index) => (
            <div key={slide.id}>
              <HoverSliderImage
                index={index}
                imageUrl={slide.imageUrl}
                src={slide.imageUrl}
                alt={slide.title}
                className="size-full max-h-96 object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
          ))}
        </HoverSliderImageWrap>
      </div>
    </HoverSlider>
  )
}
