# 어디까지?

OpenStreetMap Nominatim에서 실제 장소를 검색하고, 두 지점 사이의 자동차 도로 거리를 확인하는 웹앱입니다.

## 실행 및 배포

별도의 빌드 단계나 환경변수 없이 Vercel에 배포할 수 있습니다.

1. 이 폴더의 파일을 GitHub 저장소에 올립니다.
2. Vercel에서 해당 저장소를 Import합니다.
3. Framework Preset은 `Other`로 두고 추가 설정 없이 Deploy합니다.

Vercel은 `api/` 폴더의 서버리스 함수를 자동으로 배포합니다. 함수가 Nominatim 장소 검색과 OSRM 경로 조회를 중계하며, Redis나 별도 API 키는 필요하지 않습니다.

## 거리 및 지도

- 거리는 OSRM 공개 자동차 경로 서비스가 반환하는 도로 거리입니다. 직선거리가 아닙니다.
- `지도에서 보기`는 OpenStreetMap의 자동차 길찾기 화면을 새 탭으로 엽니다.
- 장소 검색은 OpenStreetMap Nominatim을 사용합니다. Nominatim 서비스 정책에 따라 자동완성 요청을 지연하고 검색 결과를 캐시합니다. 대량 트래픽이나 상용 서비스로 확장할 때는 Nominatim 및 OSRM 운영 정책을 확인하고 적합한 호스팅 서비스를 사용하세요.
- OpenStreetMap 데이터는 © OpenStreetMap contributors이며, 공개 Nominatim/OSRM 서비스의 가용성이나 응답 속도는 보장되지 않습니다.
