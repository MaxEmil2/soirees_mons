/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                     EVENT CARD COMPONENT                           ║
 * ║            Composant de carte d'événement moderne                  ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

/**
 * Crée une carte d'événement optimisée
 */
export function createEventCard(event) {
  const card = document.createElement('div');
  card.className = 'event-card';
  card.dataset.eventId = event.id;

  // Format de la date
  const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
  const dateFormatted = eventDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const timeFormatted = eventDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Badge de disponibilité
  let availabilityBadge = '';
  if (event.availableSpots !== undefined) {
    const percentage = (event.availableSpots / event.totalSpots) * 100;
    let badgeColor = '#10b981'; // Vert
    let badgeText = `${event.availableSpots} places`;

    if (percentage < 20) {
      badgeColor = '#ef4444'; // Rouge
      badgeText = `Plus que ${event.availableSpots} places !`;
    } else if (percentage < 50) {
      badgeColor = '#f59e0b'; // Orange
    }

    availabilityBadge = `
      <span style="
        background: ${badgeColor};
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
      ">${badgeText}</span>
    `;
  }

  // Prix
  const priceDisplay = event.price > 0 ? `${event.price.toFixed(2)}€` : 'Gratuit';

  card.innerHTML = `
    <div style="
      background: #1a1a2e;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      cursor: pointer;
      height: 100%;
      display: flex;
      flex-direction: column;
    ">
      <!-- Image -->
      <div style="
        width: 100%;
        height: 200px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        position: relative;
        overflow: hidden;
      ">
        ${
          event.imageUrl
            ? `<img
                src="${event.imageUrl}"
                alt="${event.title}"
                loading="lazy"
                style="
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                "
              />`
            : `<div style="
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
              ">🎉</div>`
        }

        <!-- Badge catégorie -->
        <div style="
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          backdrop-filter: blur(8px);
        ">
          ${event.category || 'Événement'}
        </div>

        <!-- Badge prix -->
        <div style="
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: rgba(108, 99, 255, 0.9);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 16px;
          font-weight: 700;
          backdrop-filter: blur(8px);
        ">
          ${priceDisplay}
        </div>
      </div>

      <!-- Contenu -->
      <div style="
        padding: 20px;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
      ">
        <!-- Titre -->
        <h3 style="
          color: white;
          font-size: 20px;
          font-weight: 700;
          margin: 0;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        ">${event.title}</h3>

        <!-- Date et lieu -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
          ">
            <span>📅</span>
            <span>${dateFormatted} à ${timeFormatted}</span>
          </div>
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
          ">
            <span>📍</span>
            <span>${event.location}</span>
          </div>
        </div>

        <!-- Description -->
        ${
          event.description
            ? `<p style="
                color: rgba(255, 255, 255, 0.6);
                font-size: 14px;
                line-height: 1.5;
                margin: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
              ">${event.description}</p>`
            : ''
        }

        <!-- Footer -->
        <div style="
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        ">
          ${availabilityBadge}

          <button class="event-card-btn" style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
          ">
            Voir détails
          </button>
        </div>
      </div>
    </div>
  `;

  // Effet hover sur la carte
  card.addEventListener('mouseenter', () => {
    card.firstElementChild.style.transform = 'translateY(-8px)';
    card.firstElementChild.style.boxShadow = '0 12px 40px rgba(108, 99, 255, 0.4)';
  });

  card.addEventListener('mouseleave', () => {
    card.firstElementChild.style.transform = 'translateY(0)';
    card.firstElementChild.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
  });

  // Effet hover sur le bouton
  const btn = card.querySelector('.event-card-btn');
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.05)';
    btn.style.boxShadow = '0 4px 20px rgba(108, 99, 255, 0.5)';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = 'none';
  });

  return card;
}
