function Coin({ size = 20 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
			<title>Coin Icon</title>
			<g filter="url(#filter0_d_335_257)">
				<g clipPath="url(#clip0_335_257)">
					<circle cx="9.5" cy="9" r="7.38281" fill="#FFA831" stroke="#EE8F0F" strokeWidth="0.234375" />
					<circle
						cx="9.5"
						cy="9"
						r="6.44531"
						fill="url(#paint0_linear_335_257)"
						stroke="#FDBD4D"
						strokeWidth="0.234375"
					/>
					<g filter="url(#filter1_dd_335_257)">
						<path
							d="M8.06375 5.535C8.5194 5.34748 9.00727 5.25067 9.5 5.25C9.99125 5.25 10.4788 5.3475 10.9363 5.535C11.39 5.7225 11.8025 6 12.1513 6.34875C12.5 6.6975 12.7775 7.11 12.965 7.56375C13.1525 8.02125 13.25 8.50875 13.25 9C13.25 9.99375 12.8563 10.95 12.1513 11.6512C11.8034 11.9999 11.3902 12.2765 10.9352 12.465C10.4802 12.6536 9.9925 12.7504 9.5 12.75C9.00727 12.7493 8.5194 12.6525 8.06375 12.465C7.60916 12.2763 7.19627 11.9998 6.84875 11.6512C6.50008 11.3034 6.22352 10.8902 6.03497 10.4352C5.84642 9.98023 5.74957 9.4925 5.75 9C5.75 8.00625 6.14375 7.05 6.84875 6.34875C7.1975 6 7.61 5.7225 8.06375 5.535ZM9.5 10.875L10.085 9.5925L11.375 9L10.085 8.415L9.5 7.125L8.91125 8.415L7.625 9L8.91125 9.5925L9.5 10.875Z"
							fill="#FDE194"
						/>
					</g>
				</g>
			</g>
			<defs>
				<filter
					id="filter0_d_335_257"
					x="0.125"
					y="0.09375"
					width="18.75"
					height="18.75"
					filterUnits="userSpaceOnUse"
					colorInterpolationFilters="sRGB"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feColorMatrix
						in="SourceAlpha"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
						result="hardAlpha"
					/>
					<feOffset dy="0.46875" />
					<feGaussianBlur stdDeviation="0.9375" />
					<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0" />
					<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_335_257" />
					<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_335_257" result="shape" />
				</filter>
				<filter
					id="filter1_dd_335_257"
					x="5.04688"
					y="4.78125"
					width="8.90625"
					height="8.90625"
					filterUnits="userSpaceOnUse"
					colorInterpolationFilters="sRGB"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feColorMatrix
						in="SourceAlpha"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
						result="hardAlpha"
					/>
					<feOffset dy="0.234375" />
					<feGaussianBlur stdDeviation="0.351562" />
					<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0" />
					<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_335_257" />
					<feColorMatrix
						in="SourceAlpha"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
						result="hardAlpha"
					/>
					<feOffset />
					<feGaussianBlur stdDeviation="0.234375" />
					<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.039 0" />
					<feBlend mode="normal" in2="effect1_dropShadow_335_257" result="effect2_dropShadow_335_257" />
					<feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_335_257" result="shape" />
				</filter>
				<linearGradient
					id="paint0_linear_335_257"
					x1="14.832"
					y1="12.6914"
					x2="3.64063"
					y2="6.1875"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#FEC258" />
					<stop offset="0.493004" stopColor="#F8AA1E" />
					<stop offset="0.978599" stopColor="#FEC258" />
				</linearGradient>
				<clipPath id="clip0_335_257">
					<path
						d="M2 9C2 4.85786 5.35786 1.5 9.5 1.5C13.6421 1.5 17 4.85786 17 9C17 13.1421 13.6421 16.5 9.5 16.5C5.35786 16.5 2 13.1421 2 9Z"
						fill="white"
					/>
				</clipPath>
			</defs>
		</svg>
	)
}

export default Coin
