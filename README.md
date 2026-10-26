# Soufã — Comunidade e Discografias

Plataforma web para comunidades de fãs de música. O artista cadastra seus álbuns e os fãs avaliam em quatro dimensões (letra, produção, vocal e nostalgia), acompanham como a própria opinião muda ao longo do tempo, montam tier lists e conversam em comentários aninhados.

Trabalho prático da disciplina Desenvolvimento de Sistemas Web II.

## Tecnologias

- Node.js e Express (backend)
- EJS e W3.CSS (telas)
- PostgreSQL (artistas, álbuns e avaliações)
- MongoDB (tier lists e comentários)
- RabbitMQ (Publish-Subscribe entre os serviços)
- Docker Compose (execução local)
- Chart.js, SortableJS e GSAP (gráficos, arrastar e soltar, animações)

## Arquitetura

MVC com microsserviços: `web-gateway`, `core-service` e `community-service`.

> Projeto em desenvolvimento – as instruções de execução serão adicionadas em breve.