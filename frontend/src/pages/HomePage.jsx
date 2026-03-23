import "./homePage.css";
import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons'
import { faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons'
import { faShareNodes } from '@fortawesome/free-solid-svg-icons'

// --------------|
// IMAGE IMPORTS |
// --------------|

import brushStroke from "../assets/homePageAssets/brushStroke.png";


// Button Icons
import homeIcon    from "../assets/homePageAssets/house.png";
import diaryIcon   from "../assets/homePageAssets/diary.png";
import compassIcon from "../assets/homePageAssets/compass.png";

import personIcon  from "../assets/homePageAssets/person.png";
import cactusIcon  from "../assets/homePageAssets/cactus.png";
import plusIcon    from "../assets/homePageAssets/plusSign.png";

import mapIcon     from "../assets/homePageAssets/map.png";
import grassIcon   from "../assets/homePageAssets/grass.png";
import mGlassIcon  from "../assets/homePageAssets/magnifyingGlass.png";

import heart1Icon  from "../assets/homePageAssets/heart1.png";
import heart2Icon  from "../assets/homePageAssets/heart2.png";
import heart3Icon  from "../assets/homePageAssets/heart3.png";

import zipperImg   from "../assets/homePageAssets/zipper.png";

// Polaroid shapes
const PennantSvg = ({ className, onClick}) => (
    <svg className={className} onClick={onClick} width="60" height="114" viewBox="0 0 60 114" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M0 0 H60 V110.298 C60 112.343 58.3428 114 56.2984 114 C55.4579 114 54.6424 113.714 53.9861 113.189 L30 94 L6.01391 113.189 C5.35758 113.714 4.54208 114 3.70156 114 C1.65725 114 0 112.343 0 110.298 Z"
            stroke="#f0eee7"
            strokeWidth="15"
            paintOrder="stroke fill"
        />
    </svg>
);

// Product images
import frogHeadphones  from "../assets/homePageAssets/tempProduct/frogHeadphones.jpg";
import hazelRings      from "../assets/homePageAssets/tempProduct/hazelRings.jpg";
import fishMug         from "../assets/homePageAssets/tempProduct/fishMug.jpg";
import greaves         from "../assets/homePageAssets/tempProduct/greaves.jpg";
import beachEarrings   from "../assets/homePageAssets/tempProduct/beachEarrings.jpeg";
import eyeEarrings     from "../assets/homePageAssets/tempProduct/eyeEarrings.jpg";
import dress           from "../assets/homePageAssets/tempProduct/dress.jpeg";
import bananaBoots     from "../assets/homePageAssets/tempProduct/bananaBoots.jpg";


// Temporary product data
const RECENT_TASTE = [
  { id: 1, title: "Frog cottage headphones",  creator: "@MrFrogCraft",      img: frogHeadphones},
  { id: 2, title: "Hazel eye ring set",       creator: "@SpookyEyeGirl",    img: hazelRings},
  { id: 3, title: "Fish mug blub",            creator: "@CuteFish1268",     img: fishMug},
  { id: 4, title: "Hell Yeah Greaves",        creator: "@CoolKnightArthur", img: greaves},
  { id: 5, title: "Beach Earring Set",        creator: "@PatrickTheStar",   img: beachEarrings},
  { id: 6, title: "Sunset Dress",             creator: "@EmiliaTalia",      img: dress},
  { id: 7, title: "Eyes of Ctulhu earrings",  creator: "@MoonLord",         img: eyeEarrings},
  { id: 8, title: "Banana Poopaye",           creator: "@YellowGuy",        img: bananaBoots},
];

const MIGHT_LIKE = [...RECENT_TASTE];
const TRENDING = [...RECENT_TASTE]
const YOU_FOLLOW = [...RECENT_TASTE]
const DISCOUNT = [...RECENT_TASTE]

// ------------------|
// CUSTOM COMPONENTS |
// ------------------|

// Button data and component
export const buttonData = [
    {
        id: "home",
        label: "Home",
        icons: [
            { img: compassIcon, start: { t: -10, l: 4 }, end: { t: -16, l: -2 }, z: 3, rot: -30},
            { img: diaryIcon, start: { b: -10, l: 24 }, end: { b: -16, l: 18 }, z: 1, rot: -25},
            { img: homeIcon, start: { b: -1, r: -1 }, end: { b: -7, r: -8 }, z: 3, rot: 15},
        ]
    },
    {
        id: "profile",
        label: "Profile",
        icons: [
            { img: personIcon, start: { t: -4, l: -3 }, end: { t: -10, l: -10 }, z: 1, rot: -15},
            { img: cactusIcon, start: { b: -15, r: 25 }, end: { b: -21, r: 18 }, z: 3, rot: -10},
            { img: plusIcon, start: { t: -5, r: -2 }, end: { t: -15, r: -10 }, z: 3, rot: -15},
        ]
    },
    {
        id: "discover",
        label: "Discover",
        icons: [
            { img: mapIcon, start: { b: -10, l: 1 }, end: { b: -19, l: -7 }, z: 3, rot: -20},
            { img: grassIcon, start: { t: -6, r: 35 }, end: { t: -17, r: 20 }, z: 1, rot: 0},
            { img: mGlassIcon, start: { b: 2, r: -3 }, end: { b: -4, r: -9 }, z: 3, rot: -110},
        ]
    },
    {
        id: "favorites",
        label: "Favorites",
        icons: [
            { img: heart1Icon, start: { b: -12, l: 40 }, end: { b: -20, l: 19 }, z: 1, rot: -15},
            { img: heart2Icon, start: { t: -8, l: -4 },  end: { t: -15, l: -10 }, z: 3, rot: 0},
            { img: heart3Icon, start: { b: -5, r: -12 }, end: { b: -10, r: -14 }, z: 3, rot: 30},
        ]
    }
];

const SideBarButton = ({ label, icons, isActive, onClick}) => {

    const style_choice = 1;
    return (
        <div className={`sidebar-btn-container ${isActive ? "active" : ""}`} onClick={onClick}>

            {style_choice === 0 ?

            icons.map((item, index) => {

                const iconStyle = {
                    "--t": item.start.t ? `${item.start.t}px` : "auto",
                    "--b": item.start.b ? `${item.start.b}px` : "auto",
                    "--l": item.start.l ? `${item.start.l}px` : "auto",
                    "--r": item.start.r ? `${item.start.r}px` : "auto",
                    "--hover-t": item.end.t ? `${item.end.t}px` : "auto",
                    "--hover-b": item.end.b ? `${item.end.b}px` : "auto",
                    "--hover-l": item.end.l ? `${item.end.l}px` : "auto",
                    "--hover-r": item.end.r ? `${item.end.r}px` : "auto",
                    "--z": item.z,
                    "--rot": item.rot ? `${item.rot}deg` : "0deg",
                };

                return (
                    <img
                        key={index}
                        src={item.img}
                        className="btn-icon"
                        style={iconStyle}
                        alt=""
                    />
                );
            })

            : isActive && <img src={brushStroke} className="btn-brush-stroke" alt="" />}


            <button className="sidebar-btn" />
            <span className="btn-text">{label}</span>

        </div>
    );
};

// Polaroid card and row

const PolaroidCard = ({ title, creator, img}) => {

    const [isLiked, setIsLiked] = useState(false);

    const [isPinned, setIsPinned] = useState(false);

    const toggleLike = () => setIsLiked(!isLiked);

    const togglePin = (e) => {
        e.stopPropagation();
        setIsPinned(!isPinned);
    };

    return (
        <div className="polaroid-container">
            <div className="polaroid-frame">


                <div className="polaroid-image-container">
                    <img src={img} alt={title} className="polaroid-img" />
                </div>

                <PennantSvg className={`polaroid-pennant ${isPinned ? "pinned" : ""}`} onClick={togglePin}/>

                <div className="polaroid-content">
                    <div className="polaroid-content-text">
                        <p className="product-name">{title}</p>
                        <p className="creator-name">{creator}</p>
                    </div>
                    <div className="polaroid-content-utility">
                        <FontAwesomeIcon icon={faShareNodes} color="#1B284E" size="lg"/>
                        <div className="like-container">
                            <p className="like-count">123</p>
                            <FontAwesomeIcon className={isLiked ? "heart-pop" : ""} onClick={toggleLike} style={{cursor: "pointer"}} icon={isLiked? faHeartSolid : faHeartRegular} color={isLiked ? "var(--pink)" : "var(--blue)"} size="lg"/>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
};

const CheckMoreCard = () => (
    <div className="polaroid-container">
        <div className="polaroid-frame check-more-frame">
            <p className="check-more-text">Check More</p>
            <div className="check-more-arrow">→</div>
        </div>
    </div>
);

const PolaroidRow = ({ title, items }) => {

    const scrollRef = useRef(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        let target = el.scrollLeft;
        let animFrame = null;

        const lerp = (start, end, t) => start + (end - start) * t;

        const animate = () => {
            const current = el.scrollLeft;
            const diff = target - current;

            if (Math.abs(diff) < 0.5) {
                el.scrollLeft = target;
                return;
            }

            el.scrollLeft = lerp(current, target, 0.12);
            animFrame = requestAnimationFrame(animate);
        };

        const handleWheel = (e) => {
            e.preventDefault();
            target += e.deltaY * 2;  // multiply for speed, tune to taste
            target = Math.max(0, Math.min(target, el.scrollWidth - el.clientWidth));

            cancelAnimationFrame(animFrame);
            animFrame = requestAnimationFrame(animate);
        };

        el.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            el.removeEventListener("wheel", handleWheel);
            cancelAnimationFrame(animFrame);
        };
    }, []);

    return (
        <div className="polaroid-row-container">
            <h2 className="row-title">{title}</h2>
            <div className="polaroid-grid" ref={scrollRef}>
                {items.map((item) => (
                    <PolaroidCard
                        key={item.id}
                        title={item.title}
                        creator={item.creator}
                        img={item.img}
                    />
                ))}
                <CheckMoreCard />
                <div className="grid-end-spacer" />
            </div>
        </div>
    );
};

// ------------|
// PAGE LAYOUT |
// ------------|

export default function HomePage() {

    const [activeTab, setActiveTab] = useState("home");

  return (
      <div className="container">
        <div className="sidebar">
          <div className="logo-area">
            <h2 className="logo-text">Dare</h2>
          </div>

          <div className="button-column">
              {
                  buttonData.map((btn) => (
                      <SideBarButton key={btn.id} label={btn.label} icons={btn.icons} isActive={activeTab === btn.id} onClick={() => setActiveTab(btn.id)} />
                  ))
              }
          </div>
        </div>
        <img src={zipperImg} className="zipper" alt="" />
        <div className="content-area">
            <div className="greeting-container">
                <h1 className="greeting-text">
                    Hi <span className="username-highlight">Ritiam</span>, check these out
                </h1>
            </div>
            <div className="feed-column">
                <PolaroidRow title="For Your Recent Tastes" items={RECENT_TASTE} />
                <PolaroidRow title="Some Recommendations From Us" items={MIGHT_LIKE} />
                <PolaroidRow title="Everyone's New Favorites" items={TRENDING} />
                <PolaroidRow title="From Who You Follow" items={YOU_FOLLOW} />
                <PolaroidRow title="Cheaper Than Ever" items={DISCOUNT} />
            </div>
        </div>
      </div>
  );
}
